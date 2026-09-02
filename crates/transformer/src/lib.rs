use napi::bindgen_prelude::*;
use napi_derive::napi;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::collections::HashMap;

use swc_core::common::{
    source_map::DefaultSourceMapGenConfig,
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
    pub source_maps: Option<bool>,
}

#[derive(Serialize, Deserialize)]
#[napi(object)]
pub struct RuntimeMatchOptions {
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub color_scheme: Option<String>,
}

/// Helper struct that holds parsed stylesheet declarations & resolves Tailwind CSS v4 variables
pub struct StylesheetIndex {
    pub raw_json: JsonValue,
    pub root_vars: HashMap<String, String>,
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
                } else if let Some(str_val) = v.as_str() {
                    let resolved = self.resolve_css_value(str_val, k, &local_vars);
                    Self::insert_resolved_property(&mut prop_map, k, resolved);
                } else {
                    Self::insert_resolved_property(&mut prop_map, k, v.clone());
                }
            }
        }

        // 2. Collect dynamic properties (var(--...))
        if let Some(dyn_obj) = class_val.get("_dynamic").and_then(|v| v.as_object()) {
            for (k, v) in dyn_obj {
                if !k.starts_with("--") {
                    if let Some(str_val) = v.as_str() {
                        let resolved = self.resolve_css_value(str_val, k, &local_vars);
                        Self::insert_resolved_property(&mut prop_map, k, resolved);
                    } else {
                        Self::insert_resolved_property(&mut prop_map, k, v.clone());
                    }
                }
            }
        } else if let Some(direct_obj) = class_val.as_object() {
            for (k, v) in direct_obj {
                if !k.starts_with("--") && k != "_dynamic" && k != "_static" {
                    if let Some(str_val) = v.as_str() {
                        let resolved = self.resolve_css_value(str_val, k, &local_vars);
                        Self::insert_resolved_property(&mut prop_map, k, resolved);
                    } else {
                        Self::insert_resolved_property(&mut prop_map, k, v.clone());
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
    pub fn resolve_vars(&self, input: &str, local_vars: &HashMap<String, String>) -> String {
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

    /// Resolve unit (rem -> px, px, calc evaluation, React Native specific conversions, transitions)
    pub fn resolve_css_value(&self, input: &str, property: &str, local_vars: &HashMap<String, String>) -> JsonValue {
        let after_vars = self.resolve_vars(input, local_vars);
        let trimmed_raw = after_vars.trim();

        let cleaned_box_shadow;
        let trimmed = if property == "boxShadow" {
            let parts: Vec<&str> = trimmed_raw
                .split(',')
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .collect();
            if parts.is_empty() {
                return serde_json::json!(null);
            }
            cleaned_box_shadow = parts.join(", ");
            cleaned_box_shadow.as_str()
        } else {
            trimmed_raw
        };

        // Handle animation & transition timing (e.g. "150ms" -> 150, "0.3s" -> 300)
        if property == "transitionDuration" || property == "animationDuration" || property == "transitionDelay" {
            if trimmed.ends_with("ms") {
                if let Ok(ms) = trimmed[..trimmed.len() - 2].trim().parse::<f64>() {
                    return serde_json::json!(ms);
                }
            } else if trimmed.ends_with('s') {
                if let Ok(s) = trimmed[..trimmed.len() - 1].trim().parse::<f64>() {
                    return serde_json::json!(s * 1000.0);
                }
            }
        }

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

        // Handle React Native borderStyle: must be string "solid", "dashed", "dotted"
        if property.ends_with("Style") || property.ends_with("borderStyle") || property == "borderStyle" {
            let valid_style = if trimmed == "dotted" || trimmed == "dashed" { trimmed } else { "solid" };
            return serde_json::json!(valid_style);
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

        // Handle color-mix(in srgb, ...)
        if trimmed.starts_with("color-mix(") {
            if let Some(resolved) = Self::eval_color_mix(trimmed) {
                return serde_json::json!(resolved);
            }
        }

        // Handle lab(L% a b) / oklch(L C H) / rgb(r g b / a) / hsl(h s l / a) color functions for React Native
        if (trimmed.starts_with("rgb(") || trimmed.starts_with("rgba(")) && trimmed.ends_with(')') {
            if let Some(hex) = Self::rgb_to_hex(trimmed) {
                return serde_json::json!(hex);
            }
        }
        if (trimmed.starts_with("hsl(") || trimmed.starts_with("hsla(")) && trimmed.ends_with(')') {
            if let Some(hex) = Self::hsl_to_hex(trimmed) {
                return serde_json::json!(hex);
            }
        }
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

        // 4. Handle pure numbers (except for properties that MUST be string in React Native!)
        if !property.ends_with("Style")
            && !property.ends_with("borderStyle")
            && property != "borderStyle"
            && property != "fontFamily"
            && property != "fontWeight"
            && property != "color"
            && !property.ends_with("Color")
        {
            if let Ok(num) = trimmed.parse::<f64>() {
                return serde_json::json!(num);
            }
        }

        // 5. Fallback to string (colors, flex direction, etc.)
        serde_json::json!(trimmed)
    }

    pub fn hsl_to_hex(color_str: &str) -> Option<String> {
        let prefix_len = if color_str.starts_with("hsla(") { 5 } else { 4 };
        let inner = color_str[prefix_len..color_str.len() - 1].trim();
        let (hsl_part, alpha_part) = match inner.find('/') {
            Some(idx) => (inner[..idx].trim(), Some(inner[idx + 1..].trim())),
            None => (inner, None),
        };

        let parts: Vec<&str> = if hsl_part.contains(',') {
            hsl_part.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()).collect()
        } else {
            hsl_part.split_whitespace().collect()
        };

        if parts.len() < 3 {
            return None;
        }

        let h_str = parts[0].trim_end_matches("deg");
        let h = h_str.parse::<f64>().ok()? / 360.0;
        let s = parts[1].trim_end_matches('%').parse::<f64>().ok()? / 100.0;
        let l = parts[2].trim_end_matches('%').parse::<f64>().ok()? / 100.0;

        let alpha = if let Some(a_str) = alpha_part {
            if a_str.ends_with('%') {
                a_str.trim_end_matches('%').parse::<f64>().ok()? / 100.0
            } else {
                a_str.parse::<f64>().ok()?
            }
        } else if parts.len() > 3 {
            if parts[3].ends_with('%') {
                parts[3].trim_end_matches('%').parse::<f64>().ok()? / 100.0
            } else {
                parts[3].parse::<f64>().ok()?
            }
        } else {
            1.0
        };

        let (r, g, b) = if s == 0.0 {
            (l, l, l)
        } else {
            let q = if l < 0.5 { l * (1.0 + s) } else { l + s - l * s };
            let p = 2.0 * l - q;
            let hue_to_rgb = |mut t: f64| {
                if t < 0.0 { t += 1.0; }
                if t > 1.0 { t -= 1.0; }
                if t < 1.0 / 6.0 { return p + (q - p) * 6.0 * t; }
                if t < 1.0 / 2.0 { return q; }
                if t < 2.0 / 3.0 { return p + (q - p) * (2.0 / 3.0 - t) * 6.0; }
                p
            };
            (hue_to_rgb(h + 1.0 / 3.0), hue_to_rgb(h), hue_to_rgb(h - 1.0 / 3.0))
        };

        let r_byte = (r * 255.0).round().clamp(0.0, 255.0) as u8;
        let g_byte = (g * 255.0).round().clamp(0.0, 255.0) as u8;
        let b_byte = (b * 255.0).round().clamp(0.0, 255.0) as u8;

        if (alpha - 1.0).abs() < f64::EPSILON {
            Some(format!("#{:02x}{:02x}{:02x}", r_byte, g_byte, b_byte))
        } else {
            let a_byte = (alpha * 255.0).round().clamp(0.0, 255.0) as u8;
            Some(format!("#{:02x}{:02x}{:02x}{:02x}", r_byte, g_byte, b_byte, a_byte))
        }
    }

    pub fn rgb_to_hex(color_str: &str) -> Option<String> {
        let prefix_len = if color_str.starts_with("rgba(") { 5 } else { 4 };
        let inner = color_str[prefix_len..color_str.len() - 1].trim();

        let (rgb_part, alpha_part) = match inner.find('/') {
            Some(idx) => (inner[..idx].trim(), Some(inner[idx + 1..].trim())),
            None => (inner, None),
        };

        let components: Vec<&str> = if rgb_part.contains(',') {
            rgb_part.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()).collect()
        } else {
            rgb_part.split_whitespace().collect()
        };

        if components.len() < 3 {
            return None;
        }

        let parse_comp = |s: &str| -> Option<f64> {
            if s.ends_with('%') {
                Some(s.trim_end_matches('%').parse::<f64>().ok()? * 2.55)
            } else {
                s.parse::<f64>().ok()
            }
        };

        let r = parse_comp(components[0])?.round().clamp(0.0, 255.0) as u8;
        let g = parse_comp(components[1])?.round().clamp(0.0, 255.0) as u8;
        let b = parse_comp(components[2])?.round().clamp(0.0, 255.0) as u8;

        let alpha_str = if let Some(a_str) = alpha_part {
            Some(a_str)
        } else if components.len() > 3 {
            Some(components[3])
        } else {
            None
        };

        if let Some(a_val_str) = alpha_str {
            let a_num = if a_val_str.ends_with('%') {
                a_val_str.trim_end_matches('%').parse::<f64>().ok()? / 100.0
            } else {
                a_val_str.parse::<f64>().ok()?
            };

            if (a_num - 1.0).abs() < f64::EPSILON {
                Some(format!("#{:02x}{:02x}{:02x}", r, g, b))
            } else {
                let a_byte = (a_num * 255.0).round().clamp(0.0, 255.0) as u8;
                Some(format!("#{:02x}{:02x}{:02x}{:02x}", r, g, b, a_byte))
            }
        } else {
            Some(format!("#{:02x}{:02x}{:02x}", r, g, b))
        }
    }

    pub fn lab_to_hex(color_str: &str) -> Option<String> {
        let inner = color_str[4..color_str.len() - 1].trim();
        let (lab_part, alpha_part) = match inner.find('/') {
            Some(idx) => (inner[..idx].trim(), Some(inner[idx + 1..].trim())),
            None => (inner, None),
        };

        let parts: Vec<&str> = if lab_part.contains(',') {
            lab_part.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()).collect()
        } else {
            lab_part.split_whitespace().collect()
        };

        if parts.len() < 3 {
            return None;
        }

        let l_str = parts[0].trim_end_matches('%');
        let l_val = l_str.parse::<f64>().ok()?;
        let a_val = parts[1].parse::<f64>().ok()?;
        let b_val = parts[2].parse::<f64>().ok()?;

        let alpha = if let Some(a_str) = alpha_part {
            if a_str.ends_with('%') {
                a_str.trim_end_matches('%').parse::<f64>().ok()? / 100.0
            } else {
                a_str.parse::<f64>().ok()?
            }
        } else if parts.len() > 3 {
            if parts[3].ends_with('%') {
                parts[3].trim_end_matches('%').parse::<f64>().ok()? / 100.0
            } else {
                parts[3].parse::<f64>().ok()?
            }
        } else {
            1.0
        };

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

        if (alpha - 1.0).abs() < f64::EPSILON {
            Some(format!("#{:02x}{:02x}{:02x}", r_byte, g_byte, b_byte))
        } else {
            let a_byte = (alpha * 255.0).round().clamp(0.0, 255.0) as u8;
            Some(format!("#{:02x}{:02x}{:02x}{:02x}", r_byte, g_byte, b_byte, a_byte))
        }
    }

    pub fn oklch_to_hex(color_str: &str) -> Option<String> {
        let inner = color_str[6..color_str.len() - 1].trim();
        let (oklch_part, alpha_part) = match inner.find('/') {
            Some(idx) => (inner[..idx].trim(), Some(inner[idx + 1..].trim())),
            None => (inner, None),
        };

        let parts: Vec<&str> = if oklch_part.contains(',') {
            oklch_part.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()).collect()
        } else {
            oklch_part.split_whitespace().collect()
        };

        if parts.len() < 3 {
            return None;
        }

        let l_str = parts[0].trim_end_matches('%');
        let mut l_val = l_str.parse::<f64>().ok()?;
        if parts[0].ends_with('%') || l_val > 1.0 {
            l_val /= 100.0;
        }
        let c_val = parts[1].parse::<f64>().ok()?;
        let h_val = parts[2].trim_end_matches("deg").parse::<f64>().ok()?;

        let alpha = if let Some(a_str) = alpha_part {
            if a_str.ends_with('%') {
                a_str.trim_end_matches('%').parse::<f64>().ok()? / 100.0
            } else {
                a_str.parse::<f64>().ok()?
            }
        } else if parts.len() > 3 {
            if parts[3].ends_with('%') {
                parts[3].trim_end_matches('%').parse::<f64>().ok()? / 100.0
            } else {
                parts[3].parse::<f64>().ok()?
            }
        } else {
            1.0
        };

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

        if (alpha - 1.0).abs() < f64::EPSILON {
            Some(format!("#{:02x}{:02x}{:02x}", r_byte, g_byte, b_byte))
        } else {
            let a_byte = (alpha * 255.0).round().clamp(0.0, 255.0) as u8;
            Some(format!("#{:02x}{:02x}{:02x}{:02x}", r_byte, g_byte, b_byte, a_byte))
        }
    }

    pub fn parse_color_rgba(c: &str) -> Option<(u8, u8, u8, f64)> {
        let trimmed = c.trim().to_lowercase();
        if trimmed == "transparent" {
            return Some((0, 0, 0, 0.0));
        }
        if trimmed == "white" { return Some((255, 255, 255, 1.0)); }
        if trimmed == "black" { return Some((0, 0, 0, 1.0)); }
        if trimmed == "red" { return Some((255, 0, 0, 1.0)); }
        if trimmed == "green" { return Some((0, 128, 0, 1.0)); }
        if trimmed == "blue" { return Some((0, 0, 255, 1.0)); }
        if trimmed == "yellow" { return Some((255, 255, 0, 1.0)); }

        if trimmed.starts_with('#') {
            let hex = &trimmed[1..];
            if hex.len() == 3 {
                let r = u8::from_str_radix(&hex[0..1].repeat(2), 16).ok()?;
                let g = u8::from_str_radix(&hex[1..2].repeat(2), 16).ok()?;
                let b = u8::from_str_radix(&hex[2..3].repeat(2), 16).ok()?;
                return Some((r, g, b, 1.0));
            } else if hex.len() == 4 {
                let r = u8::from_str_radix(&hex[0..1].repeat(2), 16).ok()?;
                let g = u8::from_str_radix(&hex[1..2].repeat(2), 16).ok()?;
                let b = u8::from_str_radix(&hex[2..3].repeat(2), 16).ok()?;
                let a = u8::from_str_radix(&hex[3..4].repeat(2), 16).ok()? as f64 / 255.0;
                return Some((r, g, b, a));
            } else if hex.len() == 6 {
                let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
                let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
                let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
                return Some((r, g, b, 1.0));
            } else if hex.len() == 8 {
                let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
                let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
                let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
                let a = u8::from_str_radix(&hex[6..8], 16).ok()? as f64 / 255.0;
                return Some((r, g, b, a));
            }
        }

        if trimmed.starts_with("rgb(") || trimmed.starts_with("rgba(") {
            let hex = Self::rgb_to_hex(&trimmed)?;
            return Self::parse_color_rgba(&hex);
        }
        if trimmed.starts_with("hsl(") || trimmed.starts_with("hsla(") {
            let hex = Self::hsl_to_hex(&trimmed)?;
            return Self::parse_color_rgba(&hex);
        }
        if trimmed.starts_with("oklch(") {
            let hex = Self::oklch_to_hex(&trimmed)?;
            return Self::parse_color_rgba(&hex);
        }
        if trimmed.starts_with("lab(") {
            let hex = Self::lab_to_hex(&trimmed)?;
            return Self::parse_color_rgba(&hex);
        }

        None
    }

    pub fn eval_color_mix(expr: &str) -> Option<String> {
        let inner = expr.strip_prefix("color-mix(")?.strip_suffix(')')?.trim();
        let comma_idx = inner.find(',')?;
        let _color_space = inner[..comma_idx].trim(); // e.g. "in srgb"
        let args_str = inner[comma_idx + 1..].trim();

        // Split args at top level comma
        let mut depth = 0;
        let mut split_pos = None;
        for (i, c) in args_str.char_indices() {
            if c == '(' { depth += 1; }
            else if c == ')' { depth -= 1; }
            else if c == ',' && depth == 0 {
                split_pos = Some(i);
                break;
            }
        }

        let split_pos = split_pos?;
        let arg1_str = args_str[..split_pos].trim();
        let arg2_str = args_str[split_pos + 1..].trim();

        let parse_arg = |arg: &str| -> (String, Option<f64>) {
            let parts: Vec<&str> = arg.split_whitespace().collect();
            if parts.len() >= 2 && parts.last().unwrap().ends_with('%') {
                let pct = parts.last().unwrap().trim_end_matches('%').parse::<f64>().ok();
                let col = parts[..parts.len() - 1].join(" ");
                (col, pct)
            } else if parts.len() >= 2 && parts.first().unwrap().ends_with('%') {
                let pct = parts.first().unwrap().trim_end_matches('%').parse::<f64>().ok();
                let col = parts[1..].join(" ");
                (col, pct)
            } else {
                (arg.to_string(), None)
            }
        };

        let (c1_str, p1) = parse_arg(arg1_str);
        let (c2_str, p2) = parse_arg(arg2_str);

        let (r1, g1, b1, a1) = Self::parse_color_rgba(&c1_str)?;
        let (r2, g2, b2, a2) = Self::parse_color_rgba(&c2_str)?;

        let (w1, w2) = match (p1, p2) {
            (Some(v1), Some(v2)) => {
                let sum = v1 + v2;
                if sum > 100.0 { (v1 / sum * 100.0, v2 / sum * 100.0) } else { (v1, v2) }
            }
            (Some(v1), None) => (v1, 100.0 - v1),
            (None, Some(v2)) => (100.0 - v2, v2),
            (None, None) => (50.0, 50.0),
        };

        let total_weight = w1 + w2;
        if total_weight <= 0.0 {
            return Some("transparent".to_string());
        }

        let f1 = w1 / total_weight;
        let f2 = w2 / total_weight;

        let mixed_a = a1 * f1 + a2 * f2;
        let mixed_r = if mixed_a == 0.0 { 0 } else { ((r1 as f64 * a1 * f1 + r2 as f64 * a2 * f2) / mixed_a).round() as u8 };
        let mixed_g = if mixed_a == 0.0 { 0 } else { ((g1 as f64 * a1 * f1 + g2 as f64 * a2 * f2) / mixed_a).round() as u8 };
        let mixed_b = if mixed_a == 0.0 { 0 } else { ((b1 as f64 * a1 * f1 + b2 as f64 * a2 * f2) / mixed_a).round() as u8 };

        let final_a = if total_weight < 100.0 { mixed_a * (total_weight / 100.0) } else { mixed_a };

        if (final_a - 1.0).abs() < f64::EPSILON {
            Some(format!("#{:02x}{:02x}{:02x}", mixed_r, mixed_g, mixed_b))
        } else {
            let a_byte = (final_a * 255.0).round().clamp(0.0, 255.0) as u8;
            Some(format!("#{:02x}{:02x}{:02x}{:02x}", mixed_r, mixed_g, mixed_b, a_byte))
        }
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

    pub fn parse_unit_val(s: &str) -> JsonValue {
        let trimmed = s.trim();
        if trimmed.ends_with("rem") {
            if let Ok(num) = trimmed[..trimmed.len() - 3].trim().parse::<f64>() {
                return serde_json::json!(num * 16.0);
            }
        }
        if trimmed.ends_with("px") {
            if let Ok(num) = trimmed[..trimmed.len() - 2].trim().parse::<f64>() {
                return serde_json::json!(num);
            }
        }
        if let Ok(num) = trimmed.parse::<f64>() {
            return serde_json::json!(num);
        }
        serde_json::json!(trimmed)
    }

    pub fn expand_spacing(key: &str, val: &JsonValue) -> Option<Vec<(String, JsonValue)>> {
        if key != "padding" && key != "margin" {
            return None;
        }

        if let Some(num) = val.as_f64() {
            return Some(vec![
                (format!("{}Top", key), serde_json::json!(num)),
                (format!("{}Right", key), serde_json::json!(num)),
                (format!("{}Bottom", key), serde_json::json!(num)),
                (format!("{}Left", key), serde_json::json!(num)),
            ]);
        }

        let s = val.as_str()?;
        let parts: Vec<&str> = s.split_whitespace().collect();
        match parts.len() {
            1 => {
                let v = Self::parse_unit_val(parts[0]);
                Some(vec![
                    (format!("{}Top", key), v.clone()),
                    (format!("{}Right", key), v.clone()),
                    (format!("{}Bottom", key), v.clone()),
                    (format!("{}Left", key), v),
                ])
            }
            2 => {
                let top_bottom = Self::parse_unit_val(parts[0]);
                let left_right = Self::parse_unit_val(parts[1]);
                Some(vec![
                    (format!("{}Top", key), top_bottom.clone()),
                    (format!("{}Bottom", key), top_bottom),
                    (format!("{}Left", key), left_right.clone()),
                    (format!("{}Right", key), left_right),
                ])
            }
            3 => {
                let top = Self::parse_unit_val(parts[0]);
                let left_right = Self::parse_unit_val(parts[1]);
                let bottom = Self::parse_unit_val(parts[2]);
                Some(vec![
                    (format!("{}Top", key), top),
                    (format!("{}Left", key), left_right.clone()),
                    (format!("{}Right", key), left_right),
                    (format!("{}Bottom", key), bottom),
                ])
            }
            4 => {
                let top = Self::parse_unit_val(parts[0]);
                let right = Self::parse_unit_val(parts[1]);
                let bottom = Self::parse_unit_val(parts[2]);
                let left = Self::parse_unit_val(parts[3]);
                Some(vec![
                    (format!("{}Top", key), top),
                    (format!("{}Right", key), right),
                    (format!("{}Bottom", key), bottom),
                    (format!("{}Left", key), left),
                ])
            }
            _ => None,
        }
    }

    pub fn expand_border(key: &str, val: &JsonValue) -> Option<Vec<(String, JsonValue)>> {
        if key != "border" && key != "borderTop" && key != "borderBottom" && key != "borderLeft" && key != "borderRight" {
            return None;
        }

        if let Some(s) = val.as_str() {
            if s == "none" || s == "0" || s == "0px" {
                return Some(vec![(format!("{}Width", key), serde_json::json!(0.0))]);
            }
            let parts: Vec<&str> = s.split_whitespace().collect();
            if parts.is_empty() {
                return None;
            }

            let mut results = Vec::new();
            let mut style_found = false;

            for part in parts {
                if part == "solid" || part == "dashed" || part == "dotted" {
                    results.push(("borderStyle".to_string(), serde_json::json!(part)));
                    style_found = true;
                } else if part.ends_with("px") || part.ends_with("rem") || part.parse::<f64>().is_ok() {
                    results.push((format!("{}Width", key), Self::parse_unit_val(part)));
                } else {
                    // Color token
                    results.push((format!("{}Color", key), serde_json::json!(part)));
                }
            }

            if !style_found {
                results.push(("borderStyle".to_string(), serde_json::json!("solid")));
            }

            return Some(results);
        }

        if let Some(n) = val.as_f64() {
            return Some(vec![
                (format!("{}Width", key), serde_json::json!(n)),
                ("borderStyle".to_string(), serde_json::json!("solid")),
            ]);
        }

        None
    }

    pub fn expand_logical(key: &str, val: &JsonValue) -> Option<Vec<(String, JsonValue)>> {
        match key {
            "paddingInline" => {
                if let Some(s) = val.as_str() {
                    let parts: Vec<&str> = s.split_whitespace().collect();
                    if parts.len() == 1 {
                        return Some(vec![("paddingHorizontal".to_string(), Self::parse_unit_val(parts[0]))]);
                    } else if parts.len() >= 2 {
                        return Some(vec![
                            ("paddingStart".to_string(), Self::parse_unit_val(parts[0])),
                            ("paddingEnd".to_string(), Self::parse_unit_val(parts[1])),
                        ]);
                    }
                }
                Some(vec![("paddingHorizontal".to_string(), val.clone())])
            }
            "marginInline" => {
                if let Some(s) = val.as_str() {
                    let parts: Vec<&str> = s.split_whitespace().collect();
                    if parts.len() == 1 {
                        return Some(vec![("marginHorizontal".to_string(), Self::parse_unit_val(parts[0]))]);
                    } else if parts.len() >= 2 {
                        return Some(vec![
                            ("marginStart".to_string(), Self::parse_unit_val(parts[0])),
                            ("marginEnd".to_string(), Self::parse_unit_val(parts[1])),
                        ]);
                    }
                }
                Some(vec![("marginHorizontal".to_string(), val.clone())])
            }
            "paddingBlock" => {
                if let Some(s) = val.as_str() {
                    let parts: Vec<&str> = s.split_whitespace().collect();
                    if parts.len() == 1 {
                        return Some(vec![("paddingVertical".to_string(), Self::parse_unit_val(parts[0]))]);
                    } else if parts.len() >= 2 {
                        return Some(vec![
                            ("paddingTop".to_string(), Self::parse_unit_val(parts[0])),
                            ("paddingBottom".to_string(), Self::parse_unit_val(parts[1])),
                        ]);
                    }
                }
                Some(vec![("paddingVertical".to_string(), val.clone())])
            }
            "marginBlock" => {
                if let Some(s) = val.as_str() {
                    let parts: Vec<&str> = s.split_whitespace().collect();
                    if parts.len() == 1 {
                        return Some(vec![("marginVertical".to_string(), Self::parse_unit_val(parts[0]))]);
                    } else if parts.len() >= 2 {
                        return Some(vec![
                            ("marginTop".to_string(), Self::parse_unit_val(parts[0])),
                            ("marginBottom".to_string(), Self::parse_unit_val(parts[1])),
                        ]);
                    }
                }
                Some(vec![("marginVertical".to_string(), val.clone())])
            }
            "insetInline" => {
                if let Some(s) = val.as_str() {
                    let parts: Vec<&str> = s.split_whitespace().collect();
                    if parts.len() == 1 {
                        let v = Self::parse_unit_val(parts[0]);
                        return Some(vec![
                            ("left".to_string(), v.clone()),
                            ("right".to_string(), v),
                        ]);
                    } else if parts.len() >= 2 {
                        return Some(vec![
                            ("start".to_string(), Self::parse_unit_val(parts[0])),
                            ("end".to_string(), Self::parse_unit_val(parts[1])),
                        ]);
                    }
                }
                Some(vec![("left".to_string(), val.clone()), ("right".to_string(), val.clone())])
            }
            "insetBlock" => {
                if let Some(s) = val.as_str() {
                    let parts: Vec<&str> = s.split_whitespace().collect();
                    if parts.len() == 1 {
                        let v = Self::parse_unit_val(parts[0]);
                        return Some(vec![
                            ("top".to_string(), v.clone()),
                            ("bottom".to_string(), v),
                        ]);
                    } else if parts.len() >= 2 {
                        return Some(vec![
                            ("top".to_string(), Self::parse_unit_val(parts[0])),
                            ("bottom".to_string(), Self::parse_unit_val(parts[1])),
                        ]);
                    }
                }
                Some(vec![("top".to_string(), val.clone()), ("bottom".to_string(), val.clone())])
            }
            "paddingInlineStart" => Some(vec![("paddingStart".to_string(), val.clone())]),
            "paddingInlineEnd" => Some(vec![("paddingEnd".to_string(), val.clone())]),
            "marginInlineStart" => Some(vec![("marginStart".to_string(), val.clone())]),
            "marginInlineEnd" => Some(vec![("marginEnd".to_string(), val.clone())]),
            "insetInlineStart" => Some(vec![("start".to_string(), val.clone())]),
            "insetInlineEnd" => Some(vec![("end".to_string(), val.clone())]),
            "insetBlockStart" => Some(vec![("top".to_string(), val.clone())]),
            "insetBlockEnd" => Some(vec![("bottom".to_string(), val.clone())]),
            _ => None,
        }
    }

    pub fn expand_transform(val: &JsonValue) -> Option<JsonValue> {
        let s = val.as_str()?;
        let mut transforms = Vec::new();

        let mut i = 0;
        let bytes = s.as_bytes();
        while i < bytes.len() {
            if let Some(open) = s[i..].find('(') {
                let fn_name = s[i..i + open].trim();
                let abs_open = i + open;
                if let Some(close) = s[abs_open..].find(')') {
                    let abs_close = abs_open + close;
                    let args = s[abs_open + 1..abs_close].trim();

                    match fn_name {
                        "translateX" | "translateY" | "scale" | "scaleX" | "scaleY" | "rotate" | "rotateX" | "rotateY" | "rotateZ" | "skewX" | "skewY" | "perspective" => {
                            let parsed_arg = Self::parse_unit_val(args);
                            let mut map = serde_json::Map::new();
                            map.insert(fn_name.to_string(), parsed_arg);
                            transforms.push(JsonValue::Object(map));
                        }
                        "translate" => {
                            let parts: Vec<&str> = args.split(',').map(|p| p.trim()).collect();
                            if !parts.is_empty() {
                                let mut map_x = serde_json::Map::new();
                                map_x.insert("translateX".to_string(), Self::parse_unit_val(parts[0]));
                                transforms.push(JsonValue::Object(map_x));
                                if parts.len() > 1 {
                                    let mut map_y = serde_json::Map::new();
                                    map_y.insert("translateY".to_string(), Self::parse_unit_val(parts[1]));
                                    transforms.push(JsonValue::Object(map_y));
                                }
                            }
                        }
                        "skew" => {
                            let parts: Vec<&str> = args.split(',').map(|p| p.trim()).collect();
                            if !parts.is_empty() {
                                let mut map_x = serde_json::Map::new();
                                map_x.insert("skewX".to_string(), Self::parse_unit_val(parts[0]));
                                transforms.push(JsonValue::Object(map_x));
                                if parts.len() > 1 {
                                    let mut map_y = serde_json::Map::new();
                                    map_y.insert("skewY".to_string(), Self::parse_unit_val(parts[1]));
                                    transforms.push(JsonValue::Object(map_y));
                                }
                            }
                        }
                        _ => {}
                    }
                    i = abs_close + 1;
                    continue;
                }
            }
            break;
        }

        if transforms.is_empty() {
            None
        } else {
            Some(JsonValue::Array(transforms))
        }
    }

    pub fn insert_resolved_property(prop_map: &mut HashMap<String, JsonValue>, key: &str, val: JsonValue) {
        if key == "scale" {
            prop_map.insert("transform".to_string(), serde_json::json!([{ "scale": val }]));
            return;
        }

        if let Some(expanded) = Self::expand_border(key, &val) {
            for (k, v) in expanded {
                prop_map.insert(k, v);
            }
            return;
        }

        if let Some(expanded) = Self::expand_spacing(key, &val) {
            for (k, v) in expanded {
                prop_map.insert(k, v);
            }
            return;
        }

        if let Some(expanded) = Self::expand_logical(key, &val) {
            for (k, v) in expanded {
                prop_map.insert(k, v);
            }
            return;
        }

        if key == "transform" {
            if let Some(transforms) = Self::expand_transform(&val) {
                prop_map.insert(key.to_string(), transforms);
                return;
            }
        }

        if key.ends_with("Style") || key.ends_with("borderStyle") || key == "borderStyle" {
            let s_val = val.as_str().unwrap_or("solid").to_string();
            let valid_val = if s_val == "dotted" || s_val == "dashed" { s_val } else { "solid".to_string() };
            prop_map.insert("borderStyle".to_string(), serde_json::json!(valid_val));
            return;
        }

        prop_map.insert(key.to_string(), val);
    }

    pub fn is_class_static(&self, class_name: &str) -> bool {
        let stripped = class_name
            .strip_prefix("active:")
            .or_else(|| class_name.strip_prefix("pressed:"))
            .or_else(|| class_name.strip_prefix("group-active:"))
            .or_else(|| class_name.strip_prefix("group-pressed:"))
            .or_else(|| class_name.strip_prefix("disabled:"))
            .unwrap_or(class_name);

        if stripped == "group" {
            return true;
        }

        if stripped.starts_with("peer")
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
            if cls == "group" {
                continue;
            }
            if let Some(props) = self.get_class_style(cls) {
                for (k, v) in props {
                    merged.insert(k.clone(), v.clone());
                }
            }
        }

        // Clean up React Native specific style conflicts
        merged.remove("borderBottomStyle");
        merged.remove("borderTopStyle");
        merged.remove("borderLeftStyle");
        merged.remove("borderRightStyle");

        if let Some(bs) = merged.get_mut("borderStyle") {
            if let Some(s) = bs.as_str() {
                if s != "solid" && s != "dotted" && s != "dashed" {
                    *bs = serde_json::json!("solid");
                }
            } else {
                *bs = serde_json::json!("solid");
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
    has_animated_transition: bool,
    group_depth: usize,
    group_active_used: bool,
}

impl<'a> CssTransformerVisitor<'a> {
    /// Helper to resolve a string of class names into hoisted style expressions
    fn resolve_class_string(
        &mut self,
        class_str: &str,
        disabled_prop_expr: Option<&Expr>,
    ) -> Option<(Option<Expr>, Option<Expr>, Option<Expr>, Option<Expr>, Option<Expr>)> {
        let classes: Vec<&str> = class_str.split_whitespace().collect();
        if classes.is_empty() {
            return None;
        }

        let mut normal_classes = Vec::new();
        let mut active_classes = Vec::new();
        let mut group_active_classes = Vec::new();
        let mut disabled_classes = Vec::new();
        let mut transition_classes = Vec::new();

        for cls in classes {
            if cls == "group" || cls.starts_with("group/") {
                continue;
            } else if let Some(rest) = cls.strip_prefix("active:").or_else(|| cls.strip_prefix("pressed:")) {
                active_classes.push(rest);
            } else if let Some(rest) = cls.strip_prefix("group-active:").or_else(|| cls.strip_prefix("group-pressed:")) {
                group_active_classes.push(rest);
            } else if let Some(rest) = cls.strip_prefix("disabled:") {
                disabled_classes.push(rest);
            } else if cls.starts_with("transition") || cls.starts_with("duration-") || cls.starts_with("ease-") || cls.starts_with("delay-") {
                transition_classes.push(cls);
                normal_classes.push(cls);
            } else if cls.starts_with("sm:")
                || cls.starts_with("md:")
                || cls.starts_with("lg:")
                || cls.starts_with("xl:")
                || cls.starts_with("2xl:")
                || cls.starts_with("dark:")
                || cls.starts_with("light:")
                || cls.starts_with("peer")
            {
                return None;
            } else {
                normal_classes.push(cls);
            }
        }

        if !transition_classes.is_empty() {
            self.has_animated_transition = true;
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

        let group_active_expr = if !group_active_classes.is_empty() {
            let map = self.stylesheet.compute_static_styles(&group_active_classes.join(" "))?;
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

        let transition_expr = if !transition_classes.is_empty() {
            let map = self.stylesheet.compute_static_styles(&transition_classes.join(" "));
            if let Some(trans_map) = map {
                let id = self.collector.get_or_insert(JsonValue::Object(trans_map.into_iter().collect()));
                Some(self.collector.to_member_expr(&id))
            } else {
                None
            }
        } else {
            None
        };

        if normal_expr.is_none() && active_expr.is_none() && group_active_expr.is_none() && disabled_expr.is_none() {
            return None;
        }

        Some((normal_expr, active_expr, group_active_expr, disabled_expr, transition_expr))
    }

    /// Recursively resolve dynamic branches (nested ternaries, binary ANDs, parens, string literals)
    fn transform_dynamic_branch(&mut self, expr: &Expr, disabled_prop_expr: Option<&Expr>) -> Option<Expr> {
        match expr {
            // String literal: "bg-blue-500 border-green-500"
            Expr::Lit(Lit::Str(s)) => {
                let s_str = s.value.as_str()?;
                let (normal, _, _, _, _) = self.resolve_class_string(s_str, disabled_prop_expr)?;
                normal
            }

            // Parenthesized expression: (a ? "bg-1" : "bg-2")
            Expr::Paren(p) => {
                let inner = self.transform_dynamic_branch(&p.expr, disabled_prop_expr)?;
                Some(Expr::Paren(ParenExpr {
                    span: DUMMY_SP,
                    expr: Box::new(inner),
                }))
            }

            // Ternary expression (handles arbitrary nesting in cons or alt)
            Expr::Cond(cond) => {
                let cons_expr = self.transform_dynamic_branch(&cond.cons, disabled_prop_expr);
                let alt_expr = self.transform_dynamic_branch(&cond.alt, disabled_prop_expr);

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

            // Logical AND expression: isActive && "bg-primary"
            Expr::Bin(bin) if bin.op == BinaryOp::LogicalAnd => {
                let right_expr = self.transform_dynamic_branch(&bin.right, disabled_prop_expr)?;
                Some(Expr::Bin(BinExpr {
                    span: DUMMY_SP,
                    op: BinaryOp::LogicalAnd,
                    left: bin.left.clone(),
                    right: Box::new(right_expr),
                }))
            }

            // Pass-through identifiers (e.g. dynamic class variable)
            Expr::Ident(ident) => Some(Expr::Ident(ident.clone())),

            _ => None,
        }
    }

    /// Try resolving an AST expression (literal, template literal, or ternary) into a style Expr
    fn transform_class_expr(&mut self, expr: &Expr, disabled_prop_expr: Option<&Expr>, is_pressable: bool) -> Option<Expr> {
        match expr {
            // 1. String literal: "p-4 bg-primary"
            Expr::Lit(Lit::Str(s)) => {
                let s_str = s.value.as_str()?;
                let (normal_expr, active_expr, group_active_expr, disabled_expr, _transition_expr) = self.resolve_class_string(s_str, disabled_prop_expr)?;
                self.build_combined_style_expr(
                    normal_expr.into_iter().collect(),
                    active_expr,
                    group_active_expr,
                    disabled_expr,
                    disabled_prop_expr,
                    is_pressable,
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
                let (base_normal, base_active, base_group_active, base_disabled, _) = self
                    .resolve_class_string(&static_str, disabled_prop_expr)
                    .unwrap_or((None, None, None, None, None));

                let mut dynamic_exprs: Vec<Expr> = Vec::new();
                if let Some(bn) = base_normal {
                    dynamic_exprs.push(bn);
                }

                for dynamic_part in &tpl.exprs {
                    if let Some(dyn_expr) = self.transform_dynamic_branch(dynamic_part, disabled_prop_expr) {
                        dynamic_exprs.push(dyn_expr);
                    }
                }

                if dynamic_exprs.is_empty() && base_active.is_none() && base_group_active.is_none() && base_disabled.is_none() {
                    return None;
                }

                self.build_combined_style_expr(
                    dynamic_exprs,
                    base_active,
                    base_group_active,
                    base_disabled,
                    disabled_prop_expr,
                    is_pressable,
                )
            }

            // 3. Direct Ternary or Logical expression: className={isActive ? "bg-primary" : "bg-black"}
            Expr::Cond(_) | Expr::Bin(_) | Expr::Paren(_) => {
                self.transform_dynamic_branch(expr, disabled_prop_expr)
            }

            _ => None,
        }
    }

    /// Build combined style expression (wrapping with ({ pressed }) => [...] if active styles exist)
    fn build_combined_style_expr(
        &mut self,
        normal_exprs: Vec<Expr>,
        active_expr: Option<Expr>,
        group_active_expr: Option<Expr>,
        disabled_expr: Option<Expr>,
        disabled_prop_expr: Option<&Expr>,
        is_pressable: bool,
    ) -> Option<Expr> {
        let has_active = active_expr.is_some() && is_pressable;
        let has_group_active = group_active_expr.is_some() && self.group_depth > 0;

        if has_group_active {
            self.group_active_used = true;
        }

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
                    left: Box::new(Expr::Ident(pressed_ident.clone())),
                    right: Box::new(Expr::Unary(UnaryExpr {
                        span: DUMMY_SP,
                        op: UnaryOp::Bang,
                        arg: Box::new(dis_prop.clone()),
                    })),
                })
            } else {
                Expr::Ident(pressed_ident.clone())
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

            if let Some(grp_ast) = group_active_expr {
                array_elems.push(Some(ExprOrSpread {
                    spread: None,
                    expr: Box::new(Expr::Bin(BinExpr {
                        span: DUMMY_SP,
                        op: BinaryOp::LogicalAnd,
                        left: Box::new(Expr::Ident(pressed_ident)),
                        right: Box::new(grp_ast),
                    })),
                }));
            }

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
        } else if has_group_active {
            // Non-pressable child inside a group: uses `pressed` from parent render prop
            let grp_ast = group_active_expr.unwrap();
            let pressed_ident = Ident::new_no_ctxt("pressed".into(), DUMMY_SP);

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
                        left: Box::new(Expr::Ident(pressed_ident)),
                        right: Box::new(grp_ast),
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

            Some(Expr::Array(ArrayLit {
                span: DUMMY_SP,
                elems: array_elems,
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
    fn visit_mut_jsx_element(&mut self, el: &mut JSXElement) {
        let tag_name = match &el.opening.name {
            JSXElementName::Ident(ident) => ident.sym.as_str().to_string(),
            JSXElementName::JSXMemberExpr(mem) => mem.prop.sym.as_str().to_string(),
            _ => String::new(),
        };
        let is_pressable = tag_name == "Pressable"
            || tag_name == "TouchableOpacity"
            || tag_name == "TouchableHighlight"
            || tag_name == "TouchableWithoutFeedback";

        let mut is_group_pressable = false;
        if is_pressable {
            for attr in &el.opening.attrs {
                if let JSXAttrOrSpread::JSXAttr(jsx_attr) = attr {
                    if let JSXAttrName::Ident(ident) = &jsx_attr.name {
                        if ident.sym.as_str() == "className" {
                            if let Some(JSXAttrValue::Str(s)) = &jsx_attr.value {
                                if s.value.as_str().map(|v| v.split_whitespace().any(|c| c == "group" || c.starts_with("group/"))).unwrap_or(false) {
                                    is_group_pressable = true;
                                }
                            }
                        }
                    }
                }
            }
        }

        if is_group_pressable {
            let prev_group_active = self.group_active_used;
            self.group_active_used = false;
            self.group_depth += 1;

            el.opening.visit_mut_with(self);
            el.children.visit_mut_with(self);

            let children_used_group_active = self.group_active_used;
            self.group_depth -= 1;
            self.group_active_used = prev_group_active || children_used_group_active;

            if children_used_group_active && !el.children.is_empty() {
                let already_function = el.children.len() == 1 && match &el.children[0] {
                    JSXElementChild::JSXExprContainer(c) => match &c.expr {
                        JSXExpr::Expr(e) => matches!(**e, Expr::Arrow(_) | Expr::Fn(_)),
                        _ => false,
                    },
                    _ => false,
                };

                if !already_function {
                    let pressed_ident = Ident::new_no_ctxt("pressed".into(), DUMMY_SP);
                    let pressed_param = Pat::Object(ObjectPat {
                        span: DUMMY_SP,
                        props: vec![ObjectPatProp::Assign(AssignPatProp {
                            span: DUMMY_SP,
                            key: BindingIdent::from(pressed_ident),
                            value: None,
                        })],
                        optional: false,
                        type_ann: None,
                    });

                    let old_children = std::mem::take(&mut el.children);
                    let frag = JSXFragment {
                        span: DUMMY_SP,
                        opening: JSXOpeningFragment { span: DUMMY_SP },
                        children: old_children,
                        closing: JSXClosingFragment { span: DUMMY_SP },
                    };
                    let body_expr = Expr::JSXFragment(frag);

                    let arrow_fn = Expr::Arrow(ArrowExpr {
                        span: DUMMY_SP,
                        params: vec![pressed_param],
                        body: Box::new(ArrowFunctionBody::Expr(Box::new(body_expr))),
                        is_async: false,
                        is_generator: false,
                        type_params: None,
                        return_type: None,
                        ctxt: Default::default(),
                    });

                    el.children = vec![JSXElementChild::JSXExprContainer(JSXExprContainer {
                        span: DUMMY_SP,
                        expr: JSXExpr::Expr(Box::new(arrow_fn)),
                    })];
                }
            }
        } else {
            el.opening.visit_mut_with(self);
            el.children.visit_mut_with(self);
        }
    }

    fn visit_mut_jsx_opening_element(&mut self, opening: &mut JSXOpeningElement) {
        let tag_name = match &opening.name {
            JSXElementName::Ident(ident) => ident.sym.as_str().to_string(),
            JSXElementName::JSXMemberExpr(mem) => mem.prop.sym.as_str().to_string(),
            _ => String::new(),
        };
        let is_pressable = tag_name == "Pressable"
            || tag_name == "TouchableOpacity"
            || tag_name == "TouchableHighlight"
            || tag_name == "TouchableWithoutFeedback";

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
                                        resolved_style_expr = self.transform_class_expr(&lit_expr, disabled_prop_expr.as_ref(), is_pressable);
                                    }
                                    JSXAttrValue::JSXExprContainer(c) => {
                                        if let JSXExpr::Expr(e) = &c.expr {
                                            resolved_style_expr = self.transform_class_expr(e, disabled_prop_expr.as_ref(), is_pressable);
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

    let enable_source_map = options
        .as_ref()
        .and_then(|o| o.source_maps)
        .unwrap_or(true);

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
        has_animated_transition: false,
        group_depth: 0,
        group_active_used: false,
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

    // Codegen with SourceMap v3 support
    let mut buf = vec![];
    let mut src_map_buf = vec![];
    {
        let mut emitter = Emitter {
            cfg: Config::default(),
            cm: cm.clone(),
            comments: None,
            wr: JsWriter::new(
                cm.clone(),
                "\n",
                &mut buf,
                if enable_source_map {
                    Some(&mut src_map_buf)
                } else {
                    None
                },
            ),
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

    let map_string = if enable_source_map {
        let mut map_out = vec![];
        let map_res = cm.build_source_map(&src_map_buf, None, DefaultSourceMapGenConfig);
        if map_res.to_writer(&mut map_out).is_ok() {
            String::from_utf8(map_out).ok()
        } else {
            None
        }
    } else {
        None
    };

    Ok(TransformOutput {
        code: transformed_code,
        map: map_string,
    })
}

/// Dynamic runtime evaluator for class names & responsive styles in Rust
#[napi]
pub fn resolve_runtime_styles(
    stylesheet_json: String,
    class_names: String,
    options: Option<RuntimeMatchOptions>,
) -> Result<String> {
    let index = StylesheetIndex::from_json_str(&stylesheet_json);
    let classes: Vec<&str> = class_names.split_whitespace().collect();
    let mut merged = HashMap::new();

    let width = options.as_ref().and_then(|o| o.width).unwrap_or(375.0);
    let _height = options.as_ref().and_then(|o| o.height).unwrap_or(812.0);
    let color_scheme = options.as_ref().and_then(|o| o.color_scheme.as_deref()).unwrap_or("light");

    for cls in classes {
        // Handle media query / dark mode prefix
        if cls.starts_with("dark:") {
            if color_scheme == "dark" {
                let base = &cls[5..];
                if let Some(props) = index.get_class_style(base) {
                    for (k, v) in props {
                        merged.insert(k, v);
                    }
                }
            }
            continue;
        }

        if cls.starts_with("light:") {
            if color_scheme == "light" {
                let base = &cls[6..];
                if let Some(props) = index.get_class_style(base) {
                    for (k, v) in props {
                        merged.insert(k, v);
                    }
                }
            }
            continue;
        }

        // Responsive breakpoints: sm (640), md (768), lg (1024), xl (1280), 2xl (1536)
        if cls.starts_with("sm:") {
            if width >= 640.0 {
                if let Some(props) = index.get_class_style(&cls[3..]) {
                    for (k, v) in props { merged.insert(k, v); }
                }
            }
            continue;
        }
        if cls.starts_with("md:") {
            if width >= 768.0 {
                if let Some(props) = index.get_class_style(&cls[3..]) {
                    for (k, v) in props { merged.insert(k, v); }
                }
            }
            continue;
        }
        if cls.starts_with("lg:") {
            if width >= 1024.0 {
                if let Some(props) = index.get_class_style(&cls[3..]) {
                    for (k, v) in props { merged.insert(k, v); }
                }
            }
            continue;
        }
        if cls.starts_with("xl:") {
            if width >= 1280.0 {
                if let Some(props) = index.get_class_style(&cls[3..]) {
                    for (k, v) in props { merged.insert(k, v); }
                }
            }
            continue;
        }
        if cls.starts_with("2xl:") {
            if width >= 1536.0 {
                if let Some(props) = index.get_class_style(&cls[4..]) {
                    for (k, v) in props { merged.insert(k, v); }
                }
            }
            continue;
        }

        if let Some(props) = index.get_class_style(cls) {
            for (k, v) in props {
                merged.insert(k, v);
            }
        }
    }

    serde_json::to_string(&merged).map_err(|e| {
        Error::new(Status::GenericFailure, format!("Serialization error: {}", e))
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transform_with_sourcemap_v3() {
        let code = r##"
            import { View } from "react-native";
            export function Box() {
                return <View className="p-4 bg-primary" />;
            }
        "##.to_string();

        let sheet_json = r##"{
            ":root": {
                "--color-primary": "#0065d6"
            },
            "p-4": { "_static": { "padding": 16 } },
            "bg-primary": { "_dynamic": { "backgroundColor": "var(--color-primary)" } }
        }"##.to_string();

        let res = transform_jsx(code, Some(TransformOptions {
            filename: Some("Box.tsx".to_string()),
            stylesheet_json: Some(sheet_json),
            source_maps: Some(true),
        })).unwrap();

        assert!(res.code.contains("StyleSheet.create"));
        assert!(res.code.contains("_rnStyles"));
        assert!(res.map.is_some());
        let map_str = res.map.unwrap();
        assert!(map_str.contains("\"version\":3"));
        assert!(map_str.contains("\"sources\":[\"Box.tsx\"]"));
    }

    #[test]
    fn test_color_mix_and_oklch_support() {
        let sheet_json = r##"{
            ":root": {
                "--base": "oklch(0.6 0.25 150)",
                "--accent": "color-mix(in srgb, #ff0000 70%, #0000ff 30%)"
            },
            "bg-base": { "_dynamic": { "backgroundColor": "var(--base)" } },
            "bg-accent": { "_dynamic": { "backgroundColor": "var(--accent)" } },
            "fade": { "_dynamic": { "color": "color-mix(in srgb, var(--accent) 50%, transparent)" } }
        }"##.to_string();

        let index = StylesheetIndex::from_json_str(&sheet_json);
        let base_style = index.get_class_style("bg-base").unwrap();
        assert!(base_style.get("backgroundColor").is_some());

        let accent_style = index.get_class_style("bg-accent").unwrap();
        assert!(accent_style.get("backgroundColor").is_some());

        let accent_color = accent_style.get("backgroundColor").unwrap().as_str().unwrap();
        assert!(accent_color.starts_with("#"));
    }

    #[test]
    fn test_runtime_responsive_media_and_dark_mode() {
        let sheet_json = r##"{
            "text-base": { "_static": { "fontSize": 16 } },
            "text-lg": { "_static": { "fontSize": 18 } },
            "bg-light": { "_static": { "backgroundColor": "#ffffff" } },
            "bg-dark": { "_static": { "backgroundColor": "#000000" } }
        }"##.to_string();

        let dark_res = resolve_runtime_styles(
            sheet_json.clone(),
            "text-base md:text-lg dark:bg-dark light:bg-light".to_string(),
            Some(RuntimeMatchOptions {
                width: Some(800.0),
                height: Some(600.0),
                color_scheme: Some("dark".to_string()),
            }),
        ).unwrap();

        assert!(dark_res.contains("fontSize\":18"));
        assert!(dark_res.contains("backgroundColor\":\"#000000\""));
    }

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
            source_maps: Some(false),
        })).unwrap();

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
            source_maps: Some(false),
        })).unwrap();

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
            source_maps: Some(false),
        })).unwrap();

        assert!(res.code.contains("StyleSheet.create"));
        assert!(res.code.contains("isDisabled"));
        assert!(res.code.contains("pressed && !isDisabled"));
    }

    #[test]
    fn test_group_and_children_static_transformation() {
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
            source_maps: Some(false),
        })).unwrap();

        assert!(res.code.contains("StyleSheet.create"));
        assert!(res.code.contains("_rnStyles._s0"));
        assert!(res.code.contains("_rnStyles._s1"));
    }

    #[test]
    fn test_shorthand_spacing_and_border_transform() {
        let code = r##"
            import { View } from "react-native";
            export function Box() {
                return (
                    <View className="custom-box" />
                );
            }
        "##.to_string();

        let sheet_json = r##"{
            "custom-box": {
                "_static": {
                    "padding": "1rem 20px",
                    "margin": "10px",
                    "border": "2px solid #ff0000",
                    "paddingInline": "12px",
                    "transform": "translateX(10px) rotate(45deg)"
                }
            }
        }"##.to_string();

        let res = transform_jsx(code, Some(TransformOptions {
            filename: Some("Box.tsx".to_string()),
            stylesheet_json: Some(sheet_json),
            source_maps: Some(false),
        })).unwrap();

        assert!(res.code.contains("StyleSheet.create"));
        assert!(res.code.contains("paddingTop: 16"));
        assert!(res.code.contains("paddingRight: 20"));
        assert!(res.code.contains("paddingBottom: 16"));
        assert!(res.code.contains("paddingLeft: 20"));
        assert!(res.code.contains("marginTop: 10"));
        assert!(res.code.contains("borderWidth: 2"));
        assert!(res.code.contains("borderStyle: \"solid\""));
        assert!(res.code.contains("borderColor: \"#ff0000\""));
        assert!(res.code.contains("paddingHorizontal: 12"));
        assert!(res.code.contains("translateX: 10"));
        assert!(res.code.contains("rotate: \"45deg\""));
    }

    #[test]
    fn test_transform_nested_ternaries_in_template_literal() {
        let code = r##"
            import { View } from "react-native";
            export function ThemedCard({ variant }) {
                return (
                    <View
                        className={`p-4 rounded-xl border ${
                            variant === "primary"
                                ? "border-blue-500 bg-blue-500"
                                : variant === "secondary"
                                ? "border-green-500 bg-green-500"
                                : "border-orange-500 bg-orange-500"
                        }`}
                    />
                );
            }
        "##.to_string();

        let sheet_json = r##"{
            "p-4": { "_static": { "padding": 16 } },
            "rounded-xl": { "_static": { "borderRadius": 12 } },
            "border": { "_static": { "borderWidth": 1 } },
            "border-blue-500": { "_static": { "borderColor": "#3b82f6" } },
            "bg-blue-500": { "_static": { "backgroundColor": "#3b82f6" } },
            "border-green-500": { "_static": { "borderColor": "#22c55e" } },
            "bg-green-500": { "_static": { "backgroundColor": "#22c55e" } },
            "border-orange-500": { "_static": { "borderColor": "#f97316" } },
            "bg-orange-500": { "_static": { "backgroundColor": "#f97316" } }
        }"##.to_string();

        let res = transform_jsx(code, Some(TransformOptions {
            filename: Some("ThemedCard.tsx".to_string()),
            stylesheet_json: Some(sheet_json),
            source_maps: Some(false),
        })).unwrap();

        assert!(res.code.contains("variant === \"primary\""));
        assert!(res.code.contains("variant === \"secondary\""));
        assert!(res.code.contains("_rnStyles."));
    }
}
