use serde_json::Value as JsonValue;
use std::collections::HashMap;

use crate::StylesheetIndex;

/// Convert kebab-case property name to camelCase (e.g. background-color -> backgroundColor)
pub fn camelize(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut capitalize_next = false;
    for c in s.chars() {
        if c == '-' || c == '_' {
            capitalize_next = true;
        } else if capitalize_next {
            result.extend(c.to_uppercase());
            capitalize_next = false;
        } else {
            result.push(c);
        }
    }
    result
}

/// Strip comments and unwrap @layer and @supports blocks.
/// Skips @layer base and @property entirely since React Native views do not inherit browser resets.
pub fn flatten_blocks(css: &str) -> String {
    let mut result = String::with_capacity(css.len());
    let chars: Vec<char> = css.chars().collect();
    let len = chars.len();
    let mut i = 0;

    while i < len {
        // Skip comments /* ... */
        if i + 1 < len && chars[i] == '/' && chars[i + 1] == '*' {
            i += 2;
            while i + 1 < len && !(chars[i] == '*' && chars[i + 1] == '/') {
                i += 1;
            }
            if i + 1 < len {
                i += 2;
            } else {
                i = len;
            }
            continue;
        }

        // Skip strings "..." or '...'
        if chars[i] == '"' || chars[i] == '\'' {
            let quote = chars[i];
            result.push(quote);
            i += 1;
            while i < len {
                if chars[i] == '\\' && i + 1 < len {
                    result.push(chars[i]);
                    result.push(chars[i + 1]);
                    i += 2;
                } else if chars[i] == quote {
                    result.push(quote);
                    i += 1;
                    break;
                } else {
                    result.push(chars[i]);
                    i += 1;
                }
            }
            continue;
        }

        // Check for at-rules: @layer, @supports, @property
        if chars[i] == '@' {
            let remaining: String = chars[i..].iter().take(30).collect();
            let lower = remaining.to_ascii_lowercase();

            // Skip @layer base or @property
            let is_layer_base = lower.starts_with("@layer base") || lower.starts_with("@layer  base");
            let is_property = lower.starts_with("@property");

            let is_unwrap_layer = lower.starts_with("@layer") || lower.starts_with("@supports");

            if is_layer_base || is_property {
                // Find '{'
                while i < len && chars[i] != '{' {
                    i += 1;
                }
                if i < len && chars[i] == '{' {
                    i += 1;
                    let mut depth = 1;
                    while i < len && depth > 0 {
                        if chars[i] == '{' {
                            depth += 1;
                        } else if chars[i] == '}' {
                            depth -= 1;
                        }
                        i += 1;
                    }
                }
                continue;
            } else if is_unwrap_layer {
                // Find '{'
                while i < len && chars[i] != '{' {
                    i += 1;
                }
                if i < len && chars[i] == '{' {
                    i += 1;
                    let start_inner = i;
                    let mut depth = 1;
                    while i < len && depth > 0 {
                        if chars[i] == '{' {
                            depth += 1;
                        } else if chars[i] == '}' {
                            depth -= 1;
                            if depth == 0 {
                                break;
                            }
                        }
                        i += 1;
                    }
                    let inner: String = chars[start_inner..i].iter().collect();
                    if depth == 0 && i < len {
                        i += 1; // skip closing '}'
                    }
                    result.push_str(&flatten_blocks(&inner));
                    continue;
                }
            }
        }

        result.push(chars[i]);
        i += 1;
    }

    result
}

/// Extract clean class names from a CSS selector.
/// Handles escape characters (e.g. `.\-mx-3` -> `-mx-3`, `.active\:scale-95` -> `active:scale-95`, `.w-\[48\%\]` -> `w-[48%]`).
pub fn clean_selector(sel: &str) -> Vec<String> {
    if sel.contains(":root") {
        return vec![":root".to_string()];
    }

    let trimmed = sel.trim();
    if !trimmed.starts_with('.') {
        return Vec::new();
    }
    let after_dot = &trimmed[1..];

    let mut class_part = String::new();
    let chars: Vec<char> = after_dot.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        if chars[i] == '\\' {
            if i + 1 < chars.len() {
                class_part.push(chars[i + 1]);
                i += 2;
                continue;
            }
        }
        // Stop at unescaped pseudo-classes (that are not part of escaped class name) or combinators
        if chars[i] == ':' || chars[i] == ' ' || chars[i] == '>' || chars[i] == '~' || chars[i] == '+' || chars[i] == '[' {
            break;
        }
        class_part.push(chars[i]);
        i += 1;
    }

    if class_part.is_empty() {
        return Vec::new();
    }

    let mut names = vec![class_part.clone()];

    // For variants like disabled:bg-navy-300 or active:opacity-80, also register the base class name
    if let Some(base) = class_part
        .strip_prefix("disabled:")
        .or_else(|| class_part.strip_prefix("active:"))
        .or_else(|| class_part.strip_prefix("pressed:"))
    {
        if !base.is_empty() && !names.contains(&base.to_string()) {
            names.push(base.to_string());
        }
    }

    names
}

/// Parse declarations block (between `{` and `}`) into (property, value) pairs.
/// Correctly handles nested parentheses (e.g. calc(), var(), color-mix()) and quotes.
pub fn parse_declarations(body: &str) -> Vec<(String, String)> {
    let mut decls = Vec::new();
    let chars: Vec<char> = body.chars().collect();
    let len = chars.len();
    let mut i = 0;

    let mut current_prop = String::new();
    let mut current_val = String::new();
    let mut in_val = false;
    let mut paren_depth = 0;
    let mut in_quote: Option<char> = None;

    while i < len {
        let c = chars[i];

        if let Some(q) = in_quote {
            if c == '\\' && i + 1 < len {
                if in_val {
                    current_val.push(c);
                    current_val.push(chars[i + 1]);
                }
                i += 2;
                continue;
            } else if c == q {
                in_quote = None;
            }
            if in_val {
                current_val.push(c);
            }
            i += 1;
            continue;
        }

        if c == '"' || c == '\'' {
            in_quote = Some(c);
            if in_val {
                current_val.push(c);
            }
            i += 1;
            continue;
        }

        if c == '(' {
            paren_depth += 1;
            if in_val {
                current_val.push(c);
            }
            i += 1;
            continue;
        }

        if c == ')' {
            if paren_depth > 0 {
                paren_depth -= 1;
            }
            if in_val {
                current_val.push(c);
            }
            i += 1;
            continue;
        }

        if c == ':' && !in_val && paren_depth == 0 {
            in_val = true;
            i += 1;
            continue;
        }

        if c == ';' && paren_depth == 0 {
            let p = current_prop.trim();
            let mut v = current_val.trim();

            // Strip !important
            if v.ends_with("!important") {
                v = v[..v.len() - 10].trim();
            }

            if !p.is_empty() && !v.is_empty() {
                let final_prop = if p.starts_with("--") {
                    p.to_string()
                } else {
                    camelize(p)
                };
                decls.push((final_prop, v.to_string()));
            }

            current_prop.clear();
            current_val.clear();
            in_val = false;
            i += 1;
            continue;
        }

        if in_val {
            current_val.push(c);
        } else {
            current_prop.push(c);
        }

        i += 1;
    }

    // Trailing declaration without trailing semicolon
    let p = current_prop.trim();
    let mut v = current_val.trim();
    if v.ends_with("!important") {
        v = v[..v.len() - 10].trim();
    }
    if !p.is_empty() && !v.is_empty() {
        let final_prop = if p.starts_with("--") {
            p.to_string()
        } else {
            camelize(p)
        };
        decls.push((final_prop, v.to_string()));
    }

    decls
}

pub struct RawRule {
    pub selectors: Vec<String>,
    pub declarations: Vec<(String, String)>,
    pub media_query: Option<String>,
}

/// Parse CSS into a list of rules (handles normal rules and @media rules)
pub fn parse_rules(css: &str) -> Vec<RawRule> {
    let mut rules = Vec::new();
    let chars: Vec<char> = css.chars().collect();
    let len = chars.len();
    let mut i = 0;

    while i < len {
        // Skip whitespace
        while i < len && chars[i].is_whitespace() {
            i += 1;
        }
        if i >= len {
            break;
        }

        // Read header up to '{'
        let start_header = i;
        while i < len && chars[i] != '{' {
            i += 1;
        }
        if i >= len {
            break;
        }

        let header: String = chars[start_header..i].iter().collect();
        let header_trimmed = header.trim();
        i += 1; // skip '{'

        // Read matching block
        let start_body = i;
        let mut depth = 1;
        while i < len && depth > 0 {
            if chars[i] == '{' {
                depth += 1;
            } else if chars[i] == '}' {
                depth -= 1;
                if depth == 0 {
                    break;
                }
            }
            i += 1;
        }
        let body: String = chars[start_body..i].iter().collect();
        if depth == 0 && i < len {
            i += 1; // skip '}'
        }

        if header_trimmed.starts_with("@media") {
            // Nested media rules
            let query = header_trimmed[6..].trim().to_string();
            let inner_rules = parse_rules(&body);
            for mut r in inner_rules {
                r.media_query = Some(query.clone());
                rules.push(r);
            }
        } else if header_trimmed.starts_with('@') {
            // Other at-rules (e.g. @keyframes, @font-face) - skip
            continue;
        } else {
            // Normal rule
            let sels: Vec<String> = header_trimmed
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
            let decls = parse_declarations(&body);
            if !sels.is_empty() && !decls.is_empty() {
                rules.push(RawRule {
                    selectors: sels,
                    declarations: decls,
                    media_query: None,
                });
            }
        }
    }

    rules
}

/// Compile raw CSS string directly to JSON stylesheet value.
/// Resolves Tailwind v4 CSS variables, OKLCH/color-mix, calc(), borders, and spacing shorthands.
pub fn compile_css_to_json(raw_css: &str) -> JsonValue {
    let flattened = flatten_blocks(raw_css);
    let rules = parse_rules(&flattened);

    let mut root_vars = HashMap::new();

    // 1. First pass: Collect all :root custom properties
    for rule in &rules {
        let is_root = rule.selectors.iter().any(|s| s.contains(":root"));
        if is_root {
            for (p, v) in &rule.declarations {
                if p.starts_with("--") {
                    root_vars.insert(p.clone(), v.clone());
                }
            }
        }
    }

    // Helper StylesheetIndex instance with root_vars for pre-evaluating static properties
    let dummy_index = StylesheetIndex {
        raw_json: JsonValue::Null,
        root_vars: root_vars.clone(),
    };

    let mut final_map: serde_json::Map<String, JsonValue> = serde_json::Map::new();

    // Insert :root
    let mut root_map = serde_json::Map::new();
    for (k, v) in &root_vars {
        root_map.insert(k.clone(), JsonValue::String(v.clone()));
    }
    final_map.insert(":root".to_string(), JsonValue::Object(root_map));

    // 2. Second pass: Process selectors and declarations
    for rule in &rules {
        for sel in &rule.selectors {
            let names = clean_selector(sel);
            for name in names {
                if name == ":root" {
                    continue;
                }

                let mut static_props: HashMap<String, JsonValue> = HashMap::new();
                let mut dynamic_props: HashMap<String, JsonValue> = HashMap::new();

                for (prop, val) in &rule.declarations {
                    if prop.starts_with("--") {
                        // Local custom property
                        static_props.insert(prop.clone(), JsonValue::String(val.clone()));
                        continue;
                    }

                    let is_dynamic = val.contains("var(")
                        || val.contains("vh")
                        || val.contains("vw")
                        || val.contains("vmin")
                        || val.contains("vmax");

                    if is_dynamic {
                        dynamic_props.insert(prop.clone(), JsonValue::String(val.clone()));
                    } else {
                        // Static property: resolve units, colors, calc, RN specifics
                        let resolved = dummy_index.resolve_css_value(val, prop, &HashMap::new());
                        StylesheetIndex::insert_resolved_property(&mut static_props, prop, resolved);
                    }
                }

                // Retrieve or create entry in final_map
                let existing_entry = final_map.entry(name.clone()).or_insert_with(|| {
                    serde_json::json!({
                        "_static": {},
                        "_dynamic": {}
                    })
                });

                if let Some(entry_obj) = existing_entry.as_object_mut() {
                    if let Some(st_val) = entry_obj.get_mut("_static").and_then(|v| v.as_object_mut()) {
                        for (k, v) in static_props {
                            st_val.insert(k, v);
                        }
                    }
                    if let Some(dy_val) = entry_obj.get_mut("_dynamic").and_then(|v| v.as_object_mut()) {
                        for (k, v) in dynamic_props {
                            dy_val.insert(k, v);
                        }
                    }
                }
            }
        }
    }

    // 3. Final cleanup: normalize objects (e.g. if _dynamic is empty, simplify or keep consistent)
    for (k, v) in final_map.iter_mut() {
        if k == ":root" {
            continue;
        }
        if let Some(obj) = v.as_object_mut() {
            let dyn_empty = obj.get("_dynamic").and_then(|d| d.as_object()).map(|d| d.is_empty()).unwrap_or(true);
            if dyn_empty {
                if let Some(st) = obj.get("_static").cloned() {
                    *v = st;
                }
            }
        }
    }

    JsonValue::Object(final_map)
}
