use napi::bindgen_prelude::*;
use napi_derive::napi;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::collections::HashMap;

use swc_core::common::{
    sync::Lrc,
    FileName, SourceMap, DUMMY_SP,
};
use swc_core::ecma::ast::*;
use swc_core::ecma::codegen::{text_writer::JsWriter, Config, Emitter};
use swc_core::ecma::parser::{lexer::Lexer, Parser, StringInput, Syntax, TsSyntax};
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

#[derive(Serialize, Deserialize)]
#[napi(object)]
pub struct TransformOutput {
    pub code: String,
    pub map: Option<String>,
}

#[derive(Serialize, Deserialize)]
#[napi(object)]
pub struct TransformOptions {
    pub filename: Option<String>,
    pub stylesheet_json: Option<String>,
}

/// Helper struct that holds parsed stylesheet declarations & resolves Tailwind CSS v4 variables
pub struct StylesheetIndex {
    raw_json: JsonValue,
    root_vars: HashMap<String, String>,
}

impl StylesheetIndex {
    pub fn from_json_str(json_str: &str) -> Self {
        let mut root_vars = HashMap::new();
        let parsed = serde_json::from_str::<JsonValue>(json_str).unwrap_or(JsonValue::Null);

        if let Some(root_obj) = parsed.get(":root").and_then(|v| v.as_object()) {
            for (k, v) in root_obj {
                if let Some(s) = v.as_str() {
                    root_vars.insert(k.clone(), s.to_string());
                } else if let Some(n) = v.as_f64() {
                    root_vars.insert(k.clone(), n.to_string());
                }
            }
        }

        Self {
            raw_json: parsed,
            root_vars,
        }
    }

    /// Resolve a single class name on demand
    pub fn get_class_style(&self, class_name: &str) -> Option<HashMap<String, JsonValue>> {
        let class_val = self.raw_json.get(class_name)
            .or_else(|| self.raw_json.get(&format!("active:{}", class_name)))
            .or_else(|| self.raw_json.get(&format!("disabled:{}", class_name)))
            .or_else(|| self.raw_json.get(&format!("group-active:{}", class_name)))
            .or_else(|| {
                class_name.strip_prefix("active:")
                    .or_else(|| class_name.strip_prefix("pressed:"))
                    .or_else(|| class_name.strip_prefix("disabled:"))
                    .or_else(|| class_name.strip_prefix("group-active:"))
                    .or_else(|| class_name.strip_prefix("group-pressed:"))
                    .and_then(|rest| {
                        self.raw_json.get(rest)
                            .or_else(|| self.raw_json.get(&format!("disabled:{}", rest)))
                            .or_else(|| self.raw_json.get(&format!("active:{}", rest)))
                            .or_else(|| self.raw_json.get(&format!("group-active:{}", rest)))
                    })
            })?;
        let mut prop_map = HashMap::new();
        let mut local_vars = HashMap::new();

        // 1. Collect static properties and local variables
        if let Some(static_obj) = class_val.get("_static").and_then(|v| v.as_object()) {
            for (k, v) in static_obj {
                if k.starts_with("--") {
                    if let Some(s) = v.as_str() {
                        local_vars.insert(k.clone(), s.to_string());
                    }
                } else {
                    prop_map.insert(k.clone(), v.clone());
                }
            }
        }

        // 2. Collect dynamic properties (var(--...))
        if let Some(dyn_obj) = class_val.get("_dynamic").and_then(|v| v.as_object()) {
            for (k, v) in dyn_obj {
                if !k.starts_with("--") {
                    if let Some(str_val) = v.as_str() {
                        let resolved = self.resolve_css_value(str_val, k, &local_vars);
                        if k == "scale" {
                            prop_map.insert("transform".to_string(), serde_json::json!([{ "scale": resolved }]));
                        } else {
                            prop_map.insert(k.clone(), resolved);
                        }
                    } else {
                        prop_map.insert(k.clone(), v.clone());
                    }
                }
            }
        } else if let Some(direct_obj) = class_val.as_object() {
            for (k, v) in direct_obj {
                if !k.starts_with("--") && k != "_dynamic" && k != "_static" {
                    if let Some(str_val) = v.as_str() {
                        let resolved = self.resolve_css_value(str_val, k, &local_vars);
                        if k == "scale" {
                            prop_map.insert("transform".to_string(), serde_json::json!([{ "scale": resolved }]));
                        } else {
                            prop_map.insert(k.clone(), resolved);
                        }
                    } else {
                        prop_map.insert(k.clone(), v.clone());
                    }
                }
            }
        }

        if prop_map.is_empty() {
            None
        } else {
            Some(prop_map)
        }
    }

    /// Recursively resolve var(--name, fallback)
    fn resolve_vars(&self, input: &str, local_vars: &HashMap<String, String>) -> String {
        let mut result = input.to_string();
        let mut iterations = 0;

        while result.contains("var(") && iterations < 8 {
            iterations += 1;
            let start = match result.find("var(") {
                Some(s) => s,
                None => break,
            };

            let mut depth = 0;
            let mut end = None;
            for (i, c) in result[start..].char_indices() {
                if c == '(' {
                    depth += 1;
                } else if c == ')' {
                    depth -= 1;
                    if depth == 0 {
                        end = Some(start + i);
                        break;
                    }
                }
            }

            let end_idx = match end {
                Some(e) => e,
                None => break,
            };

            let var_content = result[start + 4..end_idx].trim().to_string();
            let (var_name, fallback) = match var_content.find(',') {
                Some(idx) => (
                    var_content[..idx].trim().to_string(),
                    Some(var_content[idx + 1..].trim().to_string()),
                ),
                None => (var_content, None),
            };

            let replacement = if let Some(val) = local_vars.get(&var_name) {
                val.as_str()
            } else if let Some(val) = self.root_vars.get(&var_name) {
                val.as_str()
            } else if let Some(fb) = &fallback {
                fb.as_str()
            } else {
                ""
            };

            result.replace_range(start..=end_idx, replacement);
        }

        result
    }

    /// Resolve unit (rem -> px, px, calc evaluation, React Native specific conversions)
    fn resolve_css_value(&self, input: &str, property: &str, local_vars: &HashMap<String, String>) -> JsonValue {
        let after_vars = self.resolve_vars(input, local_vars);
        let trimmed = after_vars.trim();

        // Handle React Native scale percentages e.g. "95%" -> 0.95
        if property == "scale" {
            let first_part = trimmed.split_whitespace().next().unwrap_or(trimmed);
            if first_part.ends_with('%') {
                if let Ok(pct) = first_part.trim_end_matches('%').parse::<f64>() {
                    return serde_json::json!(pct / 100.0);
                }
            }
            if let Ok(num) = first_part.parse::<f64>() {
                return serde_json::json!(num);
            }
        }

        // Handle React Native fontWeight: must be string "700", "400", etc.
        if property == "fontWeight" {
            let fw = trimmed.replace("px", "").replace("rem", "");
            return serde_json::json!(fw);
        }

        // Handle rounded-full in React Native (50% or infinity -> 9999)
        if property.contains("Radius") && (trimmed == "50%" || trimmed.contains("infinity") || trimmed == "9999px") {
            return serde_json::json!(9999.0);
        }

        // Handle lab(L% a b) / oklch(L C H) color functions for React Native
        if trimmed.starts_with("lab(") && trimmed.ends_with(')') {
            if let Some(hex) = Self::lab_to_hex(trimmed) {
                return serde_json::json!(hex);
            }
        }
        if trimmed.starts_with("oklch(") && trimmed.ends_with(')') {
            if let Some(hex) = Self::oklch_to_hex(trimmed) {
                return serde_json::json!(hex);
            }
        }

        // 1. Handle calc(a * b) or calc(a + b)
        if trimmed.starts_with("calc(") && trimmed.ends_with(')') {
            let inner = trimmed[5..trimmed.len() - 1].trim();
            let converted = inner
                .replace("rem", " * 16")
                .replace("px", "");

            if let Some(num) = Self::eval_simple_math(&converted) {
                return serde_json::json!(num);
            }
        }

        // 2. Handle rem units (1.5rem -> 24)
        if trimmed.ends_with("rem") {
            if let Ok(num) = trimmed[..trimmed.len() - 3].trim().parse::<f64>() {
                return serde_json::json!(num * 16.0);
            }
        }

        // 3. Handle px units (24px -> 24)
        if trimmed.ends_with("px") {
            if let Ok(num) = trimmed[..trimmed.len() - 2].trim().parse::<f64>() {
                return serde_json::json!(num);
            }
        }

        // 4. Handle pure numbers
        if let Ok(num) = trimmed.parse::<f64>() {
            return serde_json::json!(num);
        }

        // 5. Fallback to string (colors, flex direction, etc.)
        serde_json::json!(trimmed)
    }

    fn lab_to_hex(color_str: &str) -> Option<String> {
        let inner = color_str[4..color_str.len() - 1].trim();
        let parts: Vec<&str> = inner.split_whitespace().collect();
        if parts.len() < 3 {
            return None;
        }

        let l_str = parts[0].trim_end_matches('%');
        let l_val = l_str.parse::<f64>().ok()?;
        let a_val = parts[1].parse::<f64>().ok()?;
        let b_val = parts[2].parse::<f64>().ok()?;

        let y = (l_val + 16.0) / 116.0;
        let x = a_val / 500.0 + y;
        let z = y - b_val / 200.0;

        let f_inv = |t: f64| {
            if t > 6.0 / 29.0 {
                t * t * t
            } else {
                3.0 * (6.0 / 29.0) * (6.0 / 29.0) * (t - 4.0 / 29.0)
            }
        };

        let x = 0.95047 * f_inv(x);
        let y = 1.0 * f_inv(y);
        let z = 1.08883 * f_inv(z);

        let r = 3.2406 * x - 1.5372 * y - 0.4986 * z;
        let g = -0.9689 * x + 1.8758 * y + 0.0415 * z;
        let b = 0.0557 * x - 0.2040 * y + 1.0570 * z;

        let gamma = |c: f64| {
            if c <= 0.0031308 {
                12.92 * c
            } else {
                1.055 * c.max(0.0).powf(1.0 / 2.4) - 0.055
            }
        };

        let r_byte = (gamma(r) * 255.0).round().clamp(0.0, 255.0) as u8;
        let g_byte = (gamma(g) * 255.0).round().clamp(0.0, 255.0) as u8;
        let b_byte = (gamma(b) * 255.0).round().clamp(0.0, 255.0) as u8;

        Some(format!("#{:02x}{:02x}{:02x}", r_byte, g_byte, b_byte))
    }

    fn oklch_to_hex(color_str: &str) -> Option<String> {
        let inner = color_str[6..color_str.len() - 1].trim();
        let parts: Vec<&str> = inner.split_whitespace().collect();
        if parts.len() < 3 {
            return None;
        }

        let l_str = parts[0].trim_end_matches('%');
        let mut l_val = l_str.parse::<f64>().ok()?;
        if parts[0].ends_with('%') {
            l_val /= 100.0;
        }
        let c_val = parts[1].parse::<f64>().ok()?;
        let h_val = parts[2].parse::<f64>().ok()?;

        let h_rad = h_val.to_radians();
        let a = c_val * h_rad.cos();
        let b = c_val * h_rad.sin();

        let l_ = l_val + 0.3963377774 * a + 0.2158037573 * b;
        let m_ = l_val - 0.1055613458 * a - 0.0638541728 * b;
        let s_ = l_val - 0.0894841775 * a - 1.2914855480 * b;

        let l = l_ * l_ * l_;
        let m = m_ * m_ * m_;
        let s = s_ * s_ * s_;

        let r = 4.0767439362 * l - 3.3077115913 * m + 0.2309699292 * s;
        let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
        let b_val = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

        let gamma = |c: f64| {
            if c <= 0.0031308 {
                12.92 * c
            } else {
                1.055 * c.max(0.0).powf(1.0 / 2.4) - 0.055
            }
        };

        let r_byte = (gamma(r) * 255.0).round().clamp(0.0, 255.0) as u8;
        let g_byte = (gamma(g) * 255.0).round().clamp(0.0, 255.0) as u8;
        let b_byte = (gamma(b_val) * 255.0).round().clamp(0.0, 255.0) as u8;

        Some(format!("#{:02x}{:02x}{:02x}", r_byte, g_byte, b_byte))
    }

    /// Evaluate mathematical expressions supporting +, -, *, /, (), rem, px, and floats
    pub fn eval_simple_math(expr: &str) -> Option<f64> {
        let sanitized = expr.replace("rem", " * 16").replace("px", "");
        let chars: Vec<char> = sanitized.chars().collect();
        let mut pos = 0;

        fn skip_ws(chars: &[char], pos: &mut usize) {
            while *pos < chars.len() && chars[*pos].is_whitespace() {
                *pos += 1;
            }
        }

        fn parse_factor(chars: &[char], pos: &mut usize) -> Option<f64> {
            skip_ws(chars, pos);
            if *pos >= chars.len() {
                return None;
            }
            if chars[*pos] == '+' {
                *pos += 1;
                return parse_factor(chars, pos);
            }
            if chars[*pos] == '-' {
                *pos += 1;
                return parse_factor(chars, pos).map(|v| -v);
            }
            if chars[*pos] == '(' {
                *pos += 1;
                let val = parse_expr(chars, pos)?;
                skip_ws(chars, pos);
                if *pos < chars.len() && chars[*pos] == ')' {
                    *pos += 1;
                }
                return Some(val);
            }

            let start = *pos;
            let mut has_dot = false;
            while *pos < chars.len() {
                let c = chars[*pos];
                if c.is_ascii_digit() {
                    *pos += 1;
                } else if c == '.' && !has_dot {
                    has_dot = true;
                    *pos += 1;
                } else {
                    break;
                }
            }
            if start == *pos {
                return None;
            }
            let s: String = chars[start..*pos].iter().collect();
            s.parse::<f64>().ok()
        }

        fn parse_term(chars: &[char], pos: &mut usize) -> Option<f64> {
            let mut result = parse_factor(chars, pos)?;
            loop {
                skip_ws(chars, pos);
                if *pos >= chars.len() {
                    break;
                }
                let op = chars[*pos];
                if op == '*' || op == '/' {
                    *pos += 1;
                    let factor = parse_factor(chars, pos)?;
                    if op == '*' {
                        result *= factor;
                    } else {
                        if factor == 0.0 {
                            return None;
                        }
                        result /= factor;
                    }
                } else {
                    break;
                }
            }
            Some(result)
        }

        fn parse_expr(chars: &[char], pos: &mut usize) -> Option<f64> {
            let mut result = parse_term(chars, pos)?;
            loop {
                skip_ws(chars, pos);
                if *pos >= chars.len() {
                    break;
                }
                let op = chars[*pos];
                if op == '+' || op == '-' {
                    *pos += 1;
                    let term = parse_term(chars, pos)?;
                    if op == '+' {
                        result += term;
                    } else {
                        result -= term;
                    }
                } else {
                    break;
                }
            }
            Some(result)
        }

        parse_expr(&chars, &mut pos)
    }

    pub fn is_class_static(&self, class_name: &str) -> bool {
        let stripped = class_name
            .strip_prefix("active:")
            .or_else(|| class_name.strip_prefix("pressed:"))
            .or_else(|| class_name.strip_prefix("disabled:"))
            .unwrap_or(class_name);

        if stripped == "group"
            || stripped.starts_with("group")
            || stripped.starts_with("peer")
            || stripped.starts_with("dark:")
            || stripped.starts_with("light:")
            || stripped.starts_with("sm:")
            || stripped.starts_with("md:")
            || stripped.starts_with("lg:")
            || stripped.starts_with("xl:")
            || stripped.starts_with("2xl:")
            || stripped.starts_with("portrait:")
            || stripped.starts_with("landscape:")
        {
            return false;
        }
        true
    }

    pub fn compute_static_styles(&self, class_names_str: &str) -> Option<HashMap<String, JsonValue>> {
        let classes: Vec<&str> = class_names_str.split_whitespace().collect();
        if classes.is_empty() {
            return None;
        }

        for &cls in &classes {
            if !self.is_class_static(cls) {
                return None;
            }
        }

        let mut merged = HashMap::new();
        for &cls in &classes {
            if let Some(props) = self.get_class_style(cls) {
                for (k, v) in props {
                    merged.insert(k.clone(), v.clone());
                }
            }
        }

        if merged.is_empty() {
            None
        } else {
            Some(merged)
        }
    }
}

/// Convert serde_json::Value to SWC AST Expr
fn json_value_to_expr(val: &JsonValue) -> Expr {
    match val {
        JsonValue::Null => Expr::Lit(Lit::Null(swc_core::ecma::ast::Null { span: DUMMY_SP })),
        JsonValue::Bool(b) => Expr::Lit(Lit::Bool(Bool {
            span: DUMMY_SP,
            value: *b,
        })),
        JsonValue::Number(num) => {
            if let Some(f) = num.as_f64() {
                Expr::Lit(Lit::Num(Number {
                    span: DUMMY_SP,
                    value: f,
                    raw: None,
                }))
            } else {
                Expr::Lit(Lit::Num(Number {
                    span: DUMMY_SP,
                    value: 0.0,
                    raw: None,
                }))
            }
        }
        JsonValue::String(s) => Expr::Lit(Lit::Str(Str {
            span: DUMMY_SP,
            value: s.clone().into(),
            raw: None,
        })),
        JsonValue::Array(arr) => {
            let elems = arr
                .iter()
                .map(|item| {
                    Some(ExprOrSpread {
                        spread: None,
                        expr: Box::new(json_value_to_expr(item)),
                    })
                })
                .collect();
            Expr::Array(ArrayLit {
                span: DUMMY_SP,
                elems,
            })
        }
        JsonValue::Object(obj) => {
            let props = obj
                .iter()
                .map(|(k, v)| {
                    let prop_name = if k.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '$') {
                        PropName::Ident(IdentName::new(k.clone().into(), DUMMY_SP))
                    } else {
                        PropName::Str(Str {
                            span: DUMMY_SP,
                            value: k.clone().into(),
                            raw: None,
                        })
                    };
                    PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                        key: prop_name,
                        value: Box::new(json_value_to_expr(v)),
                    })))
                })
                .collect();
            Expr::Object(ObjectLit {
                span: DUMMY_SP,
                props,
            })
        }
    }
}

/// Collector for hoisted StyleSheet.create entries
#[derive(Default)]
pub struct StyleSheetCollector {
    pub style_map: HashMap<String, String>, // JSON string -> id
    pub styles_in_order: Vec<(String, JsonValue)>, // (id, JsonValue)
    pub counter: usize,
}

impl StyleSheetCollector {
    pub fn get_or_insert(&mut self, val: JsonValue) -> String {
        let serialized = serde_json::to_string(&val).unwrap_or_default();
        if let Some(id) = self.style_map.get(&serialized) {
            return id.clone();
        }
        let id = format!("_s{}", self.counter);
        self.counter += 1;
        self.style_map.insert(serialized, id.clone());
        self.styles_in_order.push((id.clone(), val));
        id
    }

    pub fn to_member_expr(&self, id: &str) -> Expr {
        Expr::Member(MemberExpr {
            span: DUMMY_SP,
            obj: Box::new(Expr::Ident(Ident::new_no_ctxt("_rnStyles".into(), DUMMY_SP))),
            prop: MemberProp::Ident(IdentName::new(id.into(), DUMMY_SP)),
        })
    }
}

/// AST Visitor that transforms JSX elements
struct CssTransformerVisitor<'a> {
    stylesheet: &'a StylesheetIndex,
    collector: &'a mut StyleSheetCollector,
}

impl<'a> CssTransformerVisitor<'a> {
    /// Helper to resolve a string of class names into hoisted style expressions
    fn resolve_class_string(
        &mut self,
        class_str: &str,
        disabled_prop_expr: Option<&Expr>,
    ) -> Option<(Option<Expr>, Option<Expr>, Option<Expr>)> {
        let classes: Vec<&str> = class_str.split_whitespace().collect();
        if classes.is_empty() {
            return None;
        }

        // If any class is group or group-* or peer or dynamic breakpoint, do NOT inline statically, let runtime handle it
        for cls in &classes {
            if *cls == "group"
                || cls.starts_with("group")
                || cls.starts_with("peer")
                || cls.starts_with("sm:")
                || cls.starts_with("md:")
                || cls.starts_with("lg:")
                || cls.starts_with("xl:")
                || cls.starts_with("2xl:")
                || cls.starts_with("dark:")
                || cls.starts_with("light:")
            {
                return None;
            }
        }

        let mut normal_classes = Vec::new();
        let mut active_classes = Vec::new();
        let mut disabled_classes = Vec::new();

        for cls in classes {
            if let Some(rest) = cls.strip_prefix("active:").or_else(|| cls.strip_prefix("pressed:")) {
                active_classes.push(rest);
            } else if let Some(rest) = cls.strip_prefix("disabled:") {
                disabled_classes.push(rest);
            } else {
                normal_classes.push(cls);
            }
        }

        // If disabled: variants are present but there is no disabled={...} prop on the element,
        // defer to runtime cssInterop so it can check props.disabled dynamically!
        if !disabled_classes.is_empty() && disabled_prop_expr.is_none() {
            return None;
        }

        let normal_expr = if !normal_classes.is_empty() {
            let map = self.stylesheet.compute_static_styles(&normal_classes.join(" "))?;
            let id = self.collector.get_or_insert(JsonValue::Object(map.into_iter().collect()));
            Some(self.collector.to_member_expr(&id))
        } else {
            None
        };

        let active_expr = if !active_classes.is_empty() {
            let map = self.stylesheet.compute_static_styles(&active_classes.join(" "))?;
            let id = self.collector.get_or_insert(JsonValue::Object(map.into_iter().collect()));
            Some(self.collector.to_member_expr(&id))
        } else {
            None
        };

        let disabled_expr = if !disabled_classes.is_empty() {
            let map = self.stylesheet.compute_static_styles(&disabled_classes.join(" "))?;
            let id = self.collector.get_or_insert(JsonValue::Object(map.into_iter().collect()));
            Some(self.collector.to_member_expr(&id))
        } else {
            None
        };

        if normal_expr.is_none() && active_expr.is_none() && disabled_expr.is_none() {
            return None;
        }

        Some((normal_expr, active_expr, disabled_expr))
    }

    /// Try resolving an AST expression (literal, template literal, or ternary) into a style Expr
    fn transform_class_expr(&mut self, expr: &Expr, disabled_prop_expr: Option<&Expr>) -> Option<Expr> {
        match expr {
            // 1. String literal: "p-4 bg-primary"
            Expr::Lit(Lit::Str(s)) => {
                let s_str = s.value.as_str()?;
                let (normal_expr, active_expr, disabled_expr) = self.resolve_class_string(s_str, disabled_prop_expr)?;
                self.build_combined_style_expr(
                    normal_expr.into_iter().collect(),
                    active_expr,
                    disabled_expr,
                    disabled_prop_expr,
                )
            }

            // 2. Template literal: `p-4 items-center ${isActive ? "bg-primary" : "bg-black"}`
            Expr::Tpl(tpl) => {
                let mut static_classes = Vec::new();
                for quasi in &tpl.quasis {
                    let raw = quasi.raw.as_str();
                    static_classes.push(raw);
                }
                let static_str = static_classes.join(" ");
                let (base_normal, base_active, base_disabled) = self
                    .resolve_class_string(&static_str, disabled_prop_expr)
                    .unwrap_or((None, None, None));

                let mut dynamic_exprs: Vec<Expr> = Vec::new();
                if let Some(bn) = base_normal {
                    dynamic_exprs.push(bn);
                }

                for dynamic_part in &tpl.exprs {
                    match &**dynamic_part {
                        // Ternary inside template: isActive ? "bg-primary" : "bg-black"
                        Expr::Cond(cond) => {
                            let cons_expr = match &*cond.cons {
                                Expr::Lit(Lit::Str(s)) => {
                                    if let Some(str_val) = s.value.as_str() {
                                        if let Some((Some(e), _, _)) = self.resolve_class_string(str_val, disabled_prop_expr) {
                                            Some(e)
                                        } else {
                                            None
                                        }
                                    } else {
                                        None
                                    }
                                }
                                _ => None,
                            };

                            let alt_expr = match &*cond.alt {
                                Expr::Lit(Lit::Str(s)) => {
                                    if let Some(str_val) = s.value.as_str() {
                                        if let Some((Some(e), _, _)) = self.resolve_class_string(str_val, disabled_prop_expr) {
                                            Some(e)
                                        } else {
                                            None
                                        }
                                    } else {
                                        None
                                    }
                                }
                                _ => None,
                            };

                            if cons_expr.is_some() || alt_expr.is_some() {
                                let cons_ast = cons_expr.unwrap_or_else(|| {
                                    Expr::Lit(Lit::Null(swc_core::ecma::ast::Null { span: DUMMY_SP }))
                                });
                                let alt_ast = alt_expr.unwrap_or_else(|| {
                                    Expr::Lit(Lit::Null(swc_core::ecma::ast::Null { span: DUMMY_SP }))
                                });

                                dynamic_exprs.push(Expr::Cond(CondExpr {
                                    span: DUMMY_SP,
                                    test: cond.test.clone(),
                                    cons: Box::new(cons_ast),
                                    alt: Box::new(alt_ast),
                                }));
                            }
                        }

                        // Logical AND inside template: isActive && "bg-primary"
                        Expr::Bin(bin) if bin.op == BinaryOp::LogicalAnd => {
                            if let Expr::Lit(Lit::Str(s)) = &*bin.right {
                                if let Some(str_val) = s.value.as_str() {
                                    if let Some((Some(r_expr), _, _)) = self.resolve_class_string(str_val, disabled_prop_expr) {
                                        dynamic_exprs.push(Expr::Bin(BinExpr {
                                            span: DUMMY_SP,
                                            op: BinaryOp::LogicalAnd,
                                            left: bin.left.clone(),
                                            right: Box::new(r_expr),
                                        }));
                                    }
                                }
                            }
                        }

                        _ => {}
                    }
                }

                if dynamic_exprs.is_empty() && base_active.is_none() && base_disabled.is_none() {
                    return None;
                }

                self.build_combined_style_expr(
                    dynamic_exprs,
                    base_active,
                    base_disabled,
                    disabled_prop_expr,
                )
            }

            // 3. Direct Ternary: className={isActive ? "bg-primary" : "bg-black"}
            Expr::Cond(cond) => {
                let cons_expr = match &*cond.cons {
                    Expr::Lit(Lit::Str(s)) => {
                        if let Some(str_val) = s.value.as_str() {
                            if let Some((Some(e), _, _)) = self.resolve_class_string(str_val, disabled_prop_expr) {
                                Some(e)
                            } else {
                                None
                            }
                        } else {
                            None
                        }
                    }
                    _ => None,
                };

                let alt_expr = match &*cond.alt {
                    Expr::Lit(Lit::Str(s)) => {
                        if let Some(str_val) = s.value.as_str() {
                            if let Some((Some(e), _, _)) = self.resolve_class_string(str_val, disabled_prop_expr) {
                                Some(e)
                            } else {
                                None
                            }
                        } else {
                            None
                        }
                    }
                    _ => None,
                };

                if cons_expr.is_some() || alt_expr.is_some() {
                    let cons_ast = cons_expr.unwrap_or_else(|| {
                        Expr::Lit(Lit::Null(swc_core::ecma::ast::Null { span: DUMMY_SP }))
                    });
                    let alt_ast = alt_expr.unwrap_or_else(|| {
                        Expr::Lit(Lit::Null(swc_core::ecma::ast::Null { span: DUMMY_SP }))
                    });

                    Some(Expr::Cond(CondExpr {
                        span: DUMMY_SP,
                        test: cond.test.clone(),
                        cons: Box::new(cons_ast),
                        alt: Box::new(alt_ast),
                    }))
                } else {
                    None
                }
            }

            _ => None,
        }
    }

    /// Build combined style expression (wrapping with ({ pressed }) => [...] if active styles exist)
    fn build_combined_style_expr(
        &self,
        normal_exprs: Vec<Expr>,
        active_expr: Option<Expr>,
        disabled_expr: Option<Expr>,
        disabled_prop_expr: Option<&Expr>,
    ) -> Option<Expr> {
        let has_active = active_expr.is_some();

        // 1. Build normal style expression (single item or array)
        let normal_style_expr = if normal_exprs.len() == 1 {
            normal_exprs.into_iter().next().unwrap()
        } else if !normal_exprs.is_empty() {
            Expr::Array(ArrayLit {
                span: DUMMY_SP,
                elems: normal_exprs
                    .into_iter()
                    .map(|e| Some(ExprOrSpread { spread: None, expr: Box::new(e) }))
                    .collect(),
            })
        } else {
            Expr::Lit(Lit::Null(swc_core::ecma::ast::Null { span: DUMMY_SP }))
        };

        // 2. Wrap with active pressable or dynamic states if needed
        if has_active {
            let active_ast = active_expr.unwrap();
            let pressed_ident = Ident::new_no_ctxt("pressed".into(), DUMMY_SP);
            let pressed_param = Pat::Object(ObjectPat {
                span: DUMMY_SP,
                props: vec![ObjectPatProp::Assign(AssignPatProp {
                    span: DUMMY_SP,
                    key: BindingIdent::from(pressed_ident.clone()),
                    value: None,
                })],
                optional: false,
                type_ann: None,
            });

            // If disabled is dynamic, evaluate (pressed && !disabled) && activeStyle
            let active_condition = if let Some(dis_prop) = disabled_prop_expr {
                Expr::Bin(BinExpr {
                    span: DUMMY_SP,
                    op: BinaryOp::LogicalAnd,
                    left: Box::new(Expr::Ident(pressed_ident)),
                    right: Box::new(Expr::Unary(UnaryExpr {
                        span: DUMMY_SP,
                        op: UnaryOp::Bang,
                        arg: Box::new(dis_prop.clone()),
                    })),
                })
            } else {
                Expr::Ident(pressed_ident)
            };

            let mut array_elems = vec![
                Some(ExprOrSpread {
                    spread: None,
                    expr: Box::new(normal_style_expr),
                }),
                Some(ExprOrSpread {
                    spread: None,
                    expr: Box::new(Expr::Bin(BinExpr {
                        span: DUMMY_SP,
                        op: BinaryOp::LogicalAnd,
                        left: Box::new(active_condition),
                        right: Box::new(active_ast),
                    })),
                }),
            ];

            if let (Some(dis_ast), Some(dis_prop)) = (disabled_expr, disabled_prop_expr) {
                array_elems.push(Some(ExprOrSpread {
                    spread: None,
                    expr: Box::new(Expr::Bin(BinExpr {
                        span: DUMMY_SP,
                        op: BinaryOp::LogicalAnd,
                        left: Box::new(dis_prop.clone()),
                        right: Box::new(dis_ast),
                    })),
                }));
            }

            let array_body = Expr::Array(ArrayLit {
                span: DUMMY_SP,
                elems: array_elems,
            });

            Some(Expr::Arrow(ArrowExpr {
                span: DUMMY_SP,
                params: vec![pressed_param],
                body: Box::new(swc_core::ecma::ast::ArrowFunctionBody::Expr(Box::new(array_body))),
                is_async: false,
                is_generator: false,
                type_params: None,
                return_type: None,
                ctxt: Default::default(),
            }))
        } else if let Some(dis_ast) = disabled_expr {
            if let Some(dis_prop) = disabled_prop_expr {
                Some(Expr::Array(ArrayLit {
                    span: DUMMY_SP,
                    elems: vec![
                        Some(ExprOrSpread {
                            spread: None,
                            expr: Box::new(normal_style_expr),
                        }),
                        Some(ExprOrSpread {
                            spread: None,
                            expr: Box::new(Expr::Bin(BinExpr {
                                span: DUMMY_SP,
                                op: BinaryOp::LogicalAnd,
                                left: Box::new(dis_prop.clone()),
                                right: Box::new(dis_ast),
                            })),
                        }),
                    ],
                }))
            } else {
                Some(normal_style_expr)
            }
        } else {
            Some(normal_style_expr)
        }
    }
}

impl<'a> VisitMut for CssTransformerVisitor<'a> {
    fn visit_mut_jsx_opening_element(&mut self, opening: &mut JSXOpeningElement) {
        // First check if disabled prop is present on this element before visiting children
        let mut disabled_prop_expr = None;
        for attr in &opening.attrs {
            if let JSXAttrOrSpread::JSXAttr(jsx_attr) = attr {
                if let JSXAttrName::Ident(ident) = &jsx_attr.name {
                    if ident.sym.as_str() == "disabled" {
                        if let Some(JSXAttrValue::JSXExprContainer(c)) = &jsx_attr.value {
                            if let JSXExpr::Expr(e) = &c.expr {
                                disabled_prop_expr = Some((**e).clone());
                            }
                        } else if jsx_attr.value.is_none() {
                            disabled_prop_expr = Some(Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true })));
                        }
                    }
                }
            }
        }

        // Check for className or contentContainerClassName
        let mapping = [
            ("className", "style"),
            ("contentContainerClassName", "contentContainerStyle"),
        ];

        for (class_prop, style_prop) in mapping {
            let mut resolved_style_expr = None;
            let mut class_attr_idx = None;

            for (idx, attr) in opening.attrs.iter().enumerate() {
                if let JSXAttrOrSpread::JSXAttr(jsx_attr) = attr {
                    if let JSXAttrName::Ident(ident) = &jsx_attr.name {
                        if ident.sym.as_str() == class_prop {
                            class_attr_idx = Some(idx);
                            if let Some(val) = &jsx_attr.value {
                                match val {
                                    JSXAttrValue::Str(s) => {
                                        let lit_expr = Expr::Lit(Lit::Str(s.clone()));
                                        resolved_style_expr = self.transform_class_expr(&lit_expr, disabled_prop_expr.as_ref());
                                    }
                                    JSXAttrValue::JSXExprContainer(c) => {
                                        if let JSXExpr::Expr(e) = &c.expr {
                                            resolved_style_expr = self.transform_class_expr(e, disabled_prop_expr.as_ref());
                                        }
                                    }
                                    _ => {}
                                }
                            }
                        }
                    }
                }
            }

            if let (Some(idx), Some(style_expr)) = (class_attr_idx, resolved_style_expr) {
                // Remove class attribute
                opening.attrs.remove(idx);

                // Find or create style attribute
                let mut existing_style_idx = None;
                for (s_idx, attr) in opening.attrs.iter().enumerate() {
                    if let JSXAttrOrSpread::JSXAttr(jsx_attr) = attr {
                        if let JSXAttrName::Ident(ident) = &jsx_attr.name {
                            if ident.sym.as_str() == style_prop {
                                existing_style_idx = Some(s_idx);
                                break;
                            }
                        }
                    }
                }

                if let Some(s_idx) = existing_style_idx {
                    if let JSXAttrOrSpread::JSXAttr(jsx_attr) = &mut opening.attrs[s_idx] {
                        let old_expr = match &jsx_attr.value {
                            Some(JSXAttrValue::JSXExprContainer(c)) => match &c.expr {
                                JSXExpr::Expr(e) => (**e).clone(),
                                _ => Expr::Lit(Lit::Null(swc_core::ecma::ast::Null { span: DUMMY_SP })),
                            },
                            _ => Expr::Lit(Lit::Null(swc_core::ecma::ast::Null { span: DUMMY_SP })),
                        };

                        let merged_array = Expr::Array(ArrayLit {
                            span: DUMMY_SP,
                            elems: vec![
                                Some(ExprOrSpread {
                                    spread: None,
                                    expr: Box::new(style_expr),
                                }),
                                Some(ExprOrSpread {
                                    spread: None,
                                    expr: Box::new(old_expr),
                                }),
                            ],
                        });

                        jsx_attr.value = Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                            span: DUMMY_SP,
                            expr: JSXExpr::Expr(Box::new(merged_array)),
                        }));
                    }
                } else {
                    // Create new style attribute
                    let new_style_attr = JSXAttr {
                        span: DUMMY_SP,
                        name: JSXAttrName::Ident(IdentName::new(style_prop.into(), DUMMY_SP)),
                        value: Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                            span: DUMMY_SP,
                            expr: JSXExpr::Expr(Box::new(style_expr)),
                        })),
                    };
                    opening.attrs.push(JSXAttrOrSpread::JSXAttr(new_style_attr));
                }
            }
        }

        opening.visit_mut_children_with(self);
    }
}

#[napi]
pub fn transform_jsx(code: String, options: Option<TransformOptions>) -> Result<TransformOutput> {
    let cm: Lrc<SourceMap> = Default::default();
    let filename = options
        .as_ref()
        .and_then(|o| o.filename.clone())
        .unwrap_or_else(|| "input.tsx".to_string());

    let fm = cm.new_source_file(Lrc::new(FileName::Real(filename.clone().into())), code);

    let syntax = Syntax::Typescript(TsSyntax {
        tsx: true,
        decorators: true,
        dts: false,
        no_early_errors: true,
        disallow_ambiguous_jsx_like: false,
    });

    let lexer = Lexer::new(syntax, EsVersion::latest(), StringInput::from(&*fm), None);
    let mut parser = Parser::new_from(lexer);

    let mut module = parser.parse_module().map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("SWC Parse Error in {}: {:?}", filename, e),
        )
    })?;

    // Load stylesheet index
    let stylesheet_json = options
        .as_ref()
        .and_then(|o| o.stylesheet_json.as_deref())
        .unwrap_or("{}");
    let stylesheet_index = StylesheetIndex::from_json_str(stylesheet_json);

    let mut collector = StyleSheetCollector::default();

    // Apply AST transformations
    let mut visitor = CssTransformerVisitor {
        stylesheet: &stylesheet_index,
        collector: &mut collector,
    };
    module.visit_mut_with(&mut visitor);

    if !collector.styles_in_order.is_empty() {
        // 1. Build _rnStyles object
        let props: Vec<PropOrSpread> = collector
            .styles_in_order
            .iter()
            .map(|(id, val)| {
                PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                    key: PropName::Ident(IdentName::new(id.as_str().into(), DUMMY_SP)),
                    value: Box::new(json_value_to_expr(val)),
                })))
            })
            .collect();

        let rn_styles_var = ModuleItem::Stmt(Stmt::Decl(Decl::Var(Box::new(VarDecl {
            span: DUMMY_SP,
            kind: VarDeclKind::Const,
            declare: false,
            decls: vec![VarDeclarator {
                span: DUMMY_SP,
                name: Pat::Ident(BindingIdent::from(Ident::new_no_ctxt("_rnStyles".into(), DUMMY_SP))),
                init: Some(Box::new(Expr::Call(CallExpr {
                    span: DUMMY_SP,
                    callee: Callee::Expr(Box::new(Expr::Member(MemberExpr {
                        span: DUMMY_SP,
                        obj: Box::new(Expr::Ident(Ident::new_no_ctxt("StyleSheet".into(), DUMMY_SP))),
                        prop: MemberProp::Ident(IdentName::new("create".into(), DUMMY_SP)),
                    }))),
                    args: vec![ExprOrSpread {
                        spread: None,
                        expr: Box::new(Expr::Object(ObjectLit {
                            span: DUMMY_SP,
                            props,
                        })),
                    }],
                    type_args: None,
                    ctxt: Default::default(),
                }))),
                definite: false,
            }],
            ctxt: Default::default(),
        }))));

        // 2. Check imports
        let mut has_rn_import = false;
        let mut has_stylesheet_specifier = false;
        let mut last_import_idx = None;

        for (idx, item) in module.body.iter_mut().enumerate() {
            if let ModuleItem::ModuleDecl(ModuleDecl::Import(import_decl)) = item {
                last_import_idx = Some(idx);
                let src_str = import_decl.src.value.as_str().unwrap_or("");
                if src_str == "react-native" || src_str == "react-native-web" {
                    has_rn_import = true;
                    for spec in &import_decl.specifiers {
                        if let ImportSpecifier::Named(named) = spec {
                            let name = named
                                .imported
                                .as_ref()
                                .and_then(|i| match i {
                                    ModuleExportName::Ident(id) => Some(id.sym.as_str()),
                                    ModuleExportName::Str(s) => s.value.as_str(),
                                })
                                .unwrap_or_else(|| named.local.sym.as_str());
                            if name == "StyleSheet" {
                                has_stylesheet_specifier = true;
                                break;
                            }
                        }
                    }
                    if !has_stylesheet_specifier {
                        import_decl.specifiers.push(ImportSpecifier::Named(ImportNamedSpecifier {
                            span: DUMMY_SP,
                            local: Ident::new_no_ctxt("StyleSheet".into(), DUMMY_SP),
                            imported: None,
                            is_type_only: false,
                        }));
                        has_stylesheet_specifier = true;
                    }
                }
            }
        }

        if !has_rn_import {
            let rn_import = ModuleItem::ModuleDecl(ModuleDecl::Import(ImportDecl {
                span: DUMMY_SP,
                specifiers: vec![ImportSpecifier::Named(ImportNamedSpecifier {
                    span: DUMMY_SP,
                    local: Ident::new_no_ctxt("StyleSheet".into(), DUMMY_SP),
                    imported: None,
                    is_type_only: false,
                })],
                src: Box::new(Str {
                    span: DUMMY_SP,
                    value: "react-native".into(),
                    raw: None,
                }),
                type_only: false,
                with: None,
                phase: Default::default(),
            }));
            module.body.insert(0, rn_import);
            last_import_idx = Some(last_import_idx.map_or(0, |i| i + 1));
        }

        if let Some(idx) = last_import_idx {
            module.body.insert(idx + 1, rn_styles_var);
        } else {
            module.body.insert(0, rn_styles_var);
        }
    }

    // Codegen
    let mut buf = vec![];
    {
        let mut emitter = Emitter {
            cfg: Config::default(),
            cm: cm.clone(),
            comments: None,
            wr: JsWriter::new(cm.clone(), "\n", &mut buf, None),
        };

        emitter.emit_module(&module).map_err(|e| {
            Error::new(
                Status::GenericFailure,
                format!("SWC Codegen Error in {}: {:?}", filename, e),
            )
        })?;
    }

    let transformed_code = String::from_utf8(buf).map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("SWC UTF8 Conversion Error: {:?}", e),
        )
    })?;

    Ok(TransformOutput {
        code: transformed_code,
        map: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transform_active_pressable() {
        let code = r##"
            import { Text, Pressable } from "react-native";
            export function Button() {
                return (
                    <Pressable className="bg-primary active:opacity-80 active:scale-95">
                        <Text>Press me</Text>
                    </Pressable>
                );
            }
        "##.to_string();

        let sheet_json = r##"{
            ":root": {
                "--color-primary": "#0065d6"
            },
            "bg-primary": { "_dynamic": { "backgroundColor": "var(--color-primary)" } },
            "opacity-80": { "_static": { "opacity": 0.8 } },
            "scale-95": { "_static": { "transform": [{ "scale": 0.95 }] } }
        }"##.to_string();

        let res = transform_jsx(code, Some(TransformOptions {
            filename: Some("Button.tsx".to_string()),
            stylesheet_json: Some(sheet_json),
        })).unwrap();

        println!("ACTIVE RESULT:\n{}", res.code);
        assert!(res.code.contains("StyleSheet.create"));
        assert!(res.code.contains("_rnStyles"));
        assert!(res.code.contains("pressed"));
        assert!(res.code.contains("#0065d6"));
        assert!(res.code.contains("0.8"));
    }

    #[test]
    fn test_transform_template_literal_and_ternary() {
        let code = r##"
            import { View } from "react-native";
            export function Key({ isActive }) {
                return (
                    <View className={`-mx-3 z-10 h-24 w-7 ${isActive ? "bg-primary" : "bg-black"} items-center`} />
                );
            }
        "##.to_string();

        let sheet_json = r##"{
            ":root": {
                "--color-primary": "#0065d6"
            },
            "-mx-3": { "_static": { "marginHorizontal": -12 } },
            "z-10": { "_static": { "zIndex": 10 } },
            "h-24": { "_static": { "height": 96 } },
            "w-7": { "_static": { "width": 28 } },
            "items-center": { "_static": { "alignItems": "center" } },
            "bg-primary": { "_dynamic": { "backgroundColor": "var(--color-primary)" } },
            "bg-black": { "_static": { "backgroundColor": "#000000" } }
        }"##.to_string();

        let res = transform_jsx(code, Some(TransformOptions {
            filename: Some("Key.tsx".to_string()),
            stylesheet_json: Some(sheet_json),
        })).unwrap();

        println!("TEMPLATE RESULT:\n{}", res.code);
        assert!(res.code.contains("StyleSheet.create"));
        assert!(res.code.contains("_rnStyles"));
        assert!(res.code.contains("isActive ? _rnStyles."));
    }

    #[test]
    fn test_eval_simple_math_parentheses() {
        assert_eq!(StylesheetIndex::eval_simple_math("10 + 20 * 2"), Some(50.0));
        assert_eq!(StylesheetIndex::eval_simple_math("(10 + 20) * 2"), Some(60.0));
        assert_eq!(StylesheetIndex::eval_simple_math("1rem + 8px"), Some(24.0));
    }

    #[test]
    fn test_transform_disabled_pressable() {
        let code = r##"
            import { Text, Pressable } from "react-native";
            export function Button({ isDisabled }) {
                return (
                    <Pressable
                        disabled={isDisabled}
                        className="bg-primary active:opacity-80 disabled:opacity-40 disabled:bg-navy-300"
                    >
                        <Text>Disabled Button</Text>
                    </Pressable>
                );
            }
        "##.to_string();

        let sheet_json = r##"{
            ":root": {
                "--color-primary": "#0065d6",
                "--color-navy-300": "#6b829d"
            },
            "bg-primary": { "_dynamic": { "backgroundColor": "var(--color-primary)" } },
            "opacity-80": { "_static": { "opacity": 0.8 } },
            "opacity-40": { "_static": { "opacity": 0.4 } },
            "disabled:bg-navy-300": { "_dynamic": { "backgroundColor": "var(--color-navy-300)" } }
        }"##.to_string();

        let res = transform_jsx(code, Some(TransformOptions {
            filename: Some("Button.tsx".to_string()),
            stylesheet_json: Some(sheet_json),
        })).unwrap();

        println!("DISABLED RESULT:\n{}", res.code);
        assert!(res.code.contains("StyleSheet.create"));
        assert!(res.code.contains("isDisabled"));
        assert!(res.code.contains("pressed && !isDisabled"));
    }

    #[test]
    fn test_group_not_inlined_statically() {
        let code = r##"
            import { View, Pressable } from "react-native";
            export function Card() {
                return (
                    <Pressable className="group p-4 bg-navy-700">
                        <View className="rounded-full bg-blue-500 group-active:bg-yellow-500" />
                    </Pressable>
                );
            }
        "##.to_string();

        let sheet_json = r##"{
            "p-4": { "_static": { "padding": 16 } },
            "bg-navy-700": { "_static": { "backgroundColor": "#1e293b" } },
            "rounded-full": { "_static": { "borderRadius": 9999 } },
            "bg-blue-500": { "_static": { "backgroundColor": "#3b82f6" } },
            "group-active:bg-yellow-500": { "_static": { "backgroundColor": "#eab308" } }
        }"##.to_string();

        let res = transform_jsx(code, Some(TransformOptions {
            filename: Some("Card.tsx".to_string()),
            stylesheet_json: Some(sheet_json),
        })).unwrap();

        println!("GROUP RESULT:\n{}", res.code);
        // group container and group-active child should retain className for runtime cssInterop
        assert!(res.code.contains("className=\"group"));
        assert!(res.code.contains("group-active:bg-yellow-500"));
    }
}
