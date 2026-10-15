//! Deterministic source linking. It produces ordinary checked core IR, not new authority.
use ink_core::{check, syntax::*, LangResult};
use sha2::{Digest, Sha256};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    io::Read,
    path::{Path, PathBuf},
};
const MAX_FILES: usize = 64;
const MAX_TOTAL: usize = 4_000_000;
#[derive(Clone, Debug)]
pub struct SourceFile {
    pub path: PathBuf,
    pub module: String,
    pub sha256: String,
    /// Exact UTF-8 bytes consumed by this load, including embedded standard modules.
    pub source: String,
}
pub struct Loaded {
    pub program: Program,
    pub files: Vec<SourceFile>,
}
#[derive(Clone)]
struct Token {
    start: usize,
    end: usize,
    text: String,
}
// Only dependency headers and qualified names are recognized here; the core parser
// owns the language grammar. Strings/comments are preserved verbatim.
fn tokens(s: &str) -> LangResult<Vec<Token>> {
    let bytes = s.as_bytes();
    let mut i = 0;
    let mut out = vec![];
    while i < bytes.len() {
        if bytes[i].is_ascii_whitespace() {
            i += 1;
            continue;
        }
        if s[i..].starts_with("/*") {
            let length = s[i + 2..]
                .find("*/")
                .ok_or_else(|| format!("unclosed comment at byte {i}"))?;
            i += length + 4;
            continue;
        }
        if s[i..].starts_with("//") {
            while i < bytes.len() && bytes[i] != b'\n' {
                i += 1;
            }
            continue;
        }
        let start = i;
        if bytes[i] == b'"' {
            i += 1;
            let mut ended = false;
            while i < bytes.len() {
                if bytes[i] == b'\\' {
                    i += 1;
                    if i < bytes.len() {
                        i += 1;
                    }
                } else if bytes[i] == b'"' {
                    i += 1;
                    ended = true;
                    break;
                } else {
                    i += 1;
                }
            }
            if !ended {
                return Err("unterminated import/source string".into());
            }
        } else if bytes[i].is_ascii_alphanumeric() || bytes[i] == b'_' {
            i += 1;
            while i < bytes.len() && (bytes[i].is_ascii_alphanumeric() || bytes[i] == b'_') {
                i += 1;
            }
        } else {
            let ch = s[i..].chars().next().unwrap();
            i += ch.len_utf8();
        }
        out.push(Token {
            start,
            end: i,
            text: s[start..i].into(),
        });
    }
    Ok(out)
}
fn identifier(s: &str) -> bool {
    !s.is_empty()
        && s.bytes()
            .enumerate()
            .all(|(i, b)| b.is_ascii_alphabetic() || b == b'_' || (i > 0 && b.is_ascii_digit()))
}
struct Import {
    path: String,
    alias: String,
    start: usize,
    end: usize,
}
struct Node {
    path: PathBuf,
    text: String,
    module: String,
    imports: Vec<Import>,
    deps: Vec<usize>,
    tokens: Vec<Token>,
    exports: BTreeSet<String>,
    private_states: BTreeSet<String>,
    records: BTreeSet<String>,
    has_abstract_records: bool,
}
fn header(path: PathBuf, text: String) -> LangResult<Node> {
    let ts = tokens(&text)?;
    let mut at = 0;
    if ts.first().map(|t| t.text.as_str()) != Some("module") {
        return Err("expected module declaration".into());
    }
    at += 1;
    let mut parts = vec![];
    loop {
        let name = ts.get(at).ok_or("incomplete module declaration")?;
        if !identifier(&name.text) {
            return Err("invalid module name".into());
        }
        parts.push(name.text.clone());
        at += 1;
        if ts.get(at).is_some_and(|t| t.text == ".") {
            at += 1;
        } else {
            break;
        }
    }
    if ts.get(at).map(|t| t.text.as_str()) != Some(";") {
        return Err("expected ; after module declaration".into());
    }
    at += 1;
    let module = parts.join(".");
    let mut imports = vec![];
    let mut aliases = BTreeSet::new();
    while ts.get(at).is_some_and(|t| t.text == "import") {
        let start = ts[at].start;
        at += 1;
        let target = ts.get(at).ok_or("expected quoted import path")?;
        let target: String =
            serde_json::from_str(&target.text).map_err(|_| "expected quoted import path")?;
        at += 1;
        if target.is_empty() || target.contains('\0') {
            return Err("invalid import path".into());
        }
        if ts.get(at).map(|t| t.text.as_str()) != Some("as") {
            return Err(
                "import requires an explicit namespace: import \"path.ink\" as name;".into(),
            );
        }
        at += 1;
        let alias = ts.get(at).ok_or("expected import namespace")?.text.clone();
        at += 1;
        if !identifier(&alias) || !aliases.insert(alias.clone()) {
            return Err("invalid or duplicate import namespace".into());
        }
        if ts.get(at).map(|t| t.text.as_str()) != Some(";") {
            return Err("expected ; after import".into());
        }
        let end = ts[at].end;
        at += 1;
        imports.push(Import {
            path: target,
            alias,
            start,
            end,
        });
    }
    let private_states=ts.windows(3).filter(|w|w[0].text=="private" && w[1].text=="state").map(|w|w[2].text.clone())
        .chain(ts.windows(4).filter(|w| w[0].text=="private" && w[1].text=="trainable" && w[2].text=="state").map(|w|w[3].text.clone())).collect();
    let mut exports = BTreeSet::new();
    let mut records = BTreeSet::new();
    let mut depth = 0i32;
    let mut declaration_start = true;
    let mut declarations = BTreeSet::new();
    let mut has_abstract_records=false;
    for pair in ts[at..].windows(2) {
        if depth==0 && declaration_start && pair[0].text=="abstract" {has_abstract_records=true;}
        if depth == 0
            && declaration_start
            && [
                "fn", "record", "enum", "id", "type", "state", "keep", "event", "change", "query",
                "rule", "implementation",
            ]
            .contains(&pair[0].text.as_str())
        {
            if !identifier(&pair[1].text)
                || !declarations.insert((pair[0].text.clone(), pair[1].text.clone()))
            {
                return Err(format!("duplicate or invalid declaration {}", pair[1].text));
            }
            exports.insert(pair[1].text.clone());
            declaration_start = false;
            if pair[0].text == "record" || pair[0].text == "type" {
                records.insert(pair[1].text.clone());
            }
        }
        match pair[0].text.as_str() {
            "{" | "(" | "[" => depth += 1,
            "}" | ")" | "]" => {
                depth -= 1;
                if pair[0].text == "}" && depth == 0 {
                    declaration_start = true;
                }
            }
            ";" if depth == 0 => declaration_start = true,
            _ => {}
        }
    }
    if exports.iter().any(|n| aliases.contains(n)) {
        return Err("import namespace conflicts with a declaration".into());
    }
    Ok(Node {
        path,
        text,
        module,
        imports,
        deps: vec![],
        tokens: ts,
        exports,
        private_states,
        records,
        has_abstract_records,
    })
}
fn names(node: &Node, root: bool) -> BTreeMap<String, String> {
    node.exports
        .iter()
        .map(|n| {
            let linked = if root {
                n.clone()
            } else {
                let mut hash = Sha256::new();
                hash.update((node.module.len() as u64).to_le_bytes());
                hash.update(node.module.as_bytes());
                hash.update(n.as_bytes());
                format!("ink_m{:x}", hash.finalize())
            };
            (n.clone(), linked)
        })
        .collect()
}
fn ty(t: &mut Type, names: &BTreeMap<String, String>) {
    match t {
        Type::Named(n) => {
            if let Some(value) = names.get(n) {
                *n = value.clone();
            }
        }
        Type::List(x) | Type::Buffer(x) | Type::Option(x) | Type::Vector(x, _) => ty(x, names),
        Type::Result(a, b) | Type::Table(a, b) | Type::Map(a, b) => {
            ty(a, names);
            ty(b, names);
        }
        _ => {}
    }
}
fn renamed(n: &mut String, names: &BTreeMap<String, String>) {
    if let Some(value) = names.get(n) {
        *n = value.clone();
    }
}
fn expr(
    e: &mut Expr,
    names: &BTreeMap<String, String>,
    locals: &BTreeSet<String>,
    aliases: &BTreeSet<String>,
) -> LangResult<()> {
    match e {
        Expr::Var(n) => {
            if !locals.contains(n) {
                renamed(n, names);
            }
        }
        Expr::Call(n, args) => {
            if !locals.contains(n) { renamed(n, names); }
            for a in args {
                expr(a, names, locals, aliases)?;
            }
        }
        Expr::Record(n, fields) => {
            renamed(n, names);
            for (_, v) in fields {
                expr(v, names, locals, aliases)?;
            }
        }
        Expr::Let(n, t, a, b) => {
            if aliases.contains(n) {
                return Err(format!("local binding {n} shadows an import namespace"));
            }
            if let Some(t) = t {
                ty(t, names);
            }
            expr(a, names, locals, aliases)?;
            let mut scope = locals.clone();
            scope.insert(n.clone());
            expr(b, names, &scope, aliases)?;
        }
        Expr::Lambda(n, b) => {
            if aliases.contains(n) {
                return Err(format!("lambda binding {n} shadows an import namespace"));
            }
            let mut scope = locals.clone();
            scope.insert(n.clone());
            expr(b, names, &scope, aliases)?;
        }
        Expr::Binary(_, a, b) => {
            expr(a, names, locals, aliases)?;
            expr(b, names, locals, aliases)?;
        }
        Expr::Method(x, _, args) => {
            expr(x, names, locals, aliases)?;
            for a in args {
                expr(a, names, locals, aliases)?;
            }
        }
        Expr::Neg(x) | Expr::Try(x) | Expr::Field(x, _) => expr(x, names, locals, aliases)?,
        _ => {}
    }
    Ok(())
}
fn params(
    ps: &mut [(String, Type)],
    names: &BTreeMap<String, String>,
    aliases: &BTreeSet<String>,
) -> LangResult<BTreeSet<String>> {
    let mut locals = BTreeSet::new();
    for (n, t) in ps {
        if aliases.contains(n) {
            return Err(format!("parameter {n} shadows an import namespace"));
        }
        locals.insert(n.clone());
        ty(t, names);
    }
    Ok(locals)
}
fn statements(
    ss: &mut [Statement],
    names: &BTreeMap<String, String>,
    mut locals: BTreeSet<String>,
    aliases: &BTreeSet<String>,
) -> LangResult<()> {
    for s in ss {
        match s {
            Statement::Let(n, t, e) => {
                if aliases.contains(n) {
                    return Err(format!("local binding {n} shadows an import namespace"));
                }
                if let Some(t) = t {
                    ty(t, names);
                }
                expr(e, names, &locals, aliases)?;
                locals.insert(n.clone());
            }
            Statement::Return(e) | Statement::Expr(e) => expr(e, names, &locals, aliases)?,
            Statement::Emit(n, e) => {
                renamed(n, names);
                expr(e, names, &locals, aliases)?;
            }
            Statement::If(c, a, b) => {
                expr(c, names, &locals, aliases)?;
                statements(a, names, locals.clone(), aliases)?;
                statements(b, names, locals.clone(), aliases)?;
            }
        }
    }
    Ok(())
}
fn link(
    mut p: Program,
    names: &BTreeMap<String, String>,
    aliases: &BTreeSet<String>,
) -> LangResult<Program> {
    for n in &mut p.ids {
        renamed(n, names);
    }
    p.records = p
        .records
        .into_iter()
        .map(|(mut n, mut fs)| {
            renamed(&mut n, names);
            for (_, t) in &mut fs {
                ty(t, names);
            }
            (n, fs)
        })
        .collect();
    p.enums = p
        .enums
        .into_iter()
        .map(|(mut n, fs)| {
            renamed(&mut n, names);
            (n, fs)
        })
        .collect();
    p.events = p
        .events
        .into_iter()
        .map(|(mut n, mut t)| {
            renamed(&mut n, names);
            ty(&mut t, names);
            (n, t)
        })
        .collect();
    for b in p.states.iter_mut().chain(&mut p.keeps) {
        renamed(&mut b.name, names);
        ty(&mut b.ty, names);
        expr(&mut b.value, names, &BTreeSet::new(), aliases)?;
    }
    let measures=std::mem::take(&mut p.termination.measures);
    for (mut name,mut measure) in measures {
        let f=p.functions.iter().find(|f|f.name==name).ok_or("termination function missing during linking")?;
        let locals=f.params.iter().map(|(n,_)|n.clone()).collect();
        renamed(&mut name,names);
        expr(&mut measure,names,&locals,aliases)?;
        p.termination.measures.insert(name,measure);
    }
    for f in &mut p.functions {
        renamed(&mut f.name, names);
        let locals = params(&mut f.params, names, aliases)?;
        ty(&mut f.result, names);
        expr(&mut f.body, names, &locals, aliases)?;
    }
    for a in &mut p.actions {
        renamed(&mut a.name, names);
        let locals = params(&mut a.params, names, aliases)?;
        ty(&mut a.result, names);
        for n in a.reads.iter_mut().chain(&mut a.writes).chain(&mut a.emits) {
            renamed(n, names);
        }
        statements(&mut a.body, names, locals, aliases)?;
    }
    for r in &mut p.rules {
        renamed(&mut r.name, names);
        let locals = params(&mut r.params, names, aliases)?;
        expr(&mut r.from, names, &locals, aliases)?;
        expr(&mut r.to, names, &locals, aliases)?;
    }
    for spec in &mut p.contracts.specifications {
        renamed(&mut spec.name,names);
        let mut locals=params(&mut spec.params,names,aliases)?;
        ty(&mut spec.result,names);
        for n in spec.reads.iter_mut().chain(&mut spec.writes).chain(&mut spec.emits){renamed(n,names);}
        for e in &mut spec.requires{expr(e,names,&locals,aliases)?;}
        locals.insert("result".into());
        for e in &mut spec.ensures{expr(e,names,&locals,aliases)?;}
    }
    let invariants = std::mem::take(&mut p.contracts.value_invariants);
    for (mut name, mut predicate) in invariants {
        renamed(&mut name, names);
        expr(&mut predicate, names, &BTreeSet::from(["value".into()]), aliases)?;
        p.contracts.value_invariants.insert(name, predicate);
    }
    for imp in &mut p.contracts.implementations {renamed(&mut imp.name,names);renamed(&mut imp.specification,names);}
    for e in &mut p.contracts.invariants{expr(e,names,&BTreeSet::new(),aliases)?;}
    for n in &mut p.contracts.private_states{renamed(n,names);}
    for n in p.contracts.learning.trainable.iter_mut().chain(&mut p.contracts.learning.adaptive).chain(&mut p.contracts.learning.learn) { renamed(n,names); }
    Ok(p)
}
struct Loader {
    nodes: Vec<Node>,
    indices: BTreeMap<PathBuf, usize>,
    active: BTreeSet<PathBuf>,
    modules: BTreeMap<String, PathBuf>,
    total: usize,
}
impl Loader {
    fn visit(&mut self, path: PathBuf) -> LangResult<usize> {
        let path = if path.to_string_lossy().starts_with("std:") {
            path
        } else {
            fs::canonicalize(&path).map_err(|e| format!("{}: {e}", path.display()))?
        };
        if self.active.contains(&path) {
            return Err(format!("import cycle through {}", path.display()));
        }
        if let Some(i) = self.indices.get(&path) {
            return Ok(*i);
        }
        if self.nodes.len() >= MAX_FILES {
            return Err("module graph exceeds 64 files".into());
        }
        let text = match path.to_str() {
            Some("std:words") => include_str!("../stdlib/words.ink").into(),
            Some("std:lists") => include_str!("../stdlib/lists.ink").into(),
            Some("std:text") => include_str!("../knowledge/libraries/text.ink").into(),
            Some("std:math") => include_str!("../knowledge/libraries/math.ink").into(),
            Some("std:approximation") => include_str!("../knowledge/libraries/approximation.ink").into(),
            Some("std:neural") => include_str!("../knowledge/libraries/neural.ink").into(),
            Some("std:learning") => include_str!("../knowledge/libraries/learning.ink").into(),
            Some("std:learning_session") => include_str!("../knowledge/libraries/learning_session.ink").into(),
            Some("std:autodiff") => include_str!("../knowledge/libraries/autodiff.ink").into(),
            Some("std:bit_automata") => include_str!("../knowledge/libraries/bit_automata.ink").into(),
            Some("std:json") => include_str!("../knowledge/libraries/json.ink").into(),
            Some(s) if s.starts_with("std:") => return Err(format!("unknown standard module {s}")),
            _ => {
                let mut bytes = vec![];
                fs::File::open(&path)
                    .map_err(|e| e.to_string())?
                    .take(1_000_001)
                    .read_to_end(&mut bytes)
                    .map_err(|e| e.to_string())?;
                String::from_utf8(bytes).map_err(|_| "source must be UTF-8")?
            }
        };
        if text.len() > 1_000_000 || self.total + text.len() > MAX_TOTAL {
            return Err("module source size limit exceeded".into());
        }
        self.total += text.len();
        let node = header(path.clone(), text).map_err(|e| format!("{}: {e}", path.display()))?;
        if let Some(prior) = self.modules.insert(node.module.clone(), path.clone()) {
            return Err(format!(
                "module {} is declared by both {} and {}",
                node.module,
                prior.display(),
                path.display()
            ));
        }
        let dependencies: Vec<PathBuf> = node
            .imports
            .iter()
            .map(|i| {
                if i.path.starts_with("std:") {
                    PathBuf::from(&i.path)
                } else {
                    path.parent().unwrap_or(Path::new(".")).join(&i.path)
                }
            })
            .collect();
        let index = self.nodes.len();
        self.nodes.push(node);
        self.active.insert(path.clone());
        let result = (|| {
            for dependency in dependencies {
                let i = self.visit(dependency)?;
                self.nodes[index].deps.push(i);
            }
            Ok(index)
        })();
        self.active.remove(&path);
        if result.is_ok() {
            self.indices.insert(path, index);
        }
        result
    }
    fn program(&self, index: usize) -> LangResult<SurfaceProgram> {
        let node = &self.nodes[index];
        let mut replacements: Vec<(usize, usize, String)> = node
            .imports
            .iter()
            .map(|i| {
                (
                    i.start,
                    i.end,
                    node.text[i.start..i.end]
                        .chars()
                        .map(|c| if c == '\n' { '\n' } else { ' ' })
                        .collect(),
                )
            })
            .collect();
        let aliases: BTreeSet<String> = node.imports.iter().map(|i| i.alias.clone()).collect();
        let mut imported_records = BTreeSet::new();
        for (import, dep) in node.imports.iter().zip(&node.deps) {
            let target = &self.nodes[*dep];
            let target_names = names(target, *dep == 0);
            for n in &target.records {
                imported_records.insert(target_names[n].clone());
            }
            for (position, window) in node.tokens.windows(3).enumerate() {
                let after_spread = position >= 3
                    && node.tokens[position - 3].text == "{"
                    && node.tokens[position - 2].text == "."
                    && node.tokens[position - 1].text == ".";
                if (position > 0 && node.tokens[position - 1].text == "." && !after_spread)
                    || window[0].start < import.end
                    || window[0].text != import.alias
                    || window[1].text != "."
                {
                    continue;
                }
                if target.private_states.contains(&window[2].text) {
                    return Err(format!("private state {} cannot be imported",window[2].text));
                }
                let value = target_names.get(&window[2].text).ok_or_else(|| {
                    format!(
                        "{}: {} has no declaration {}",
                        node.path.display(),
                        import.alias,
                        window[2].text
                    )
                })?;
                replacements.push((window[0].start, window[2].end, value.clone()));
            }
        }
        replacements.sort_by_key(|r| r.0);
        let mut text = String::new();
        let mut end = 0;
        let mut mapping = Vec::new();
        for (start, finish, value) in replacements {
            if start < end {
                return Err("overlapping namespace references".into());
            }
            mapping.extend(end..start);
            text.push_str(&node.text[end..start]);
            mapping.extend(std::iter::repeat_n(start, value.len()));
            text.push_str(&value);
            end = finish;
        }
        mapping.extend(end..node.text.len());
        mapping.push(node.text.len());
        text.push_str(&node.text[end..]);
        let mut parsed = parse_surface(&text, imported_records)
            .map_err(|e| source_diagnostic(node, &mapping, e))?;
        if self.nodes.iter().any(|node|node.has_abstract_records) {
            let occupied=self.nodes.iter().flat_map(|node|node.tokens.iter())
                .filter(|token|identifier(&token.text)).map(|token|token.text.clone()).collect();
            parsed.mark_accesses_avoiding(&occupied)?;
        }
        let mapping = names(node, index == 0);
        parsed.program = link(parsed.program, &mapping, &aliases)
            .map_err(|e| format!("{}: {e}", node.path.display()))?;
        parsed.abstract_records=parsed.abstract_records.into_iter().map(|(mut name,owner)|{
            renamed(&mut name,&mapping);(name,owner)
        }).collect();
        parsed.aliases = parsed
            .aliases
            .into_iter()
            .map(|(mut n, mut t)| {
                renamed(&mut n, &mapping);
                ty(&mut t, &mapping);
                (n, t)
            })
            .collect();
        parsed.parameters = parsed
            .parameters
            .into_iter()
            .map(|(mut n, vars)| {
                renamed(&mut n, &mapping);
                (n, vars)
            })
            .collect();
        parsed.constant_parameters = parsed
            .constant_parameters
            .into_iter()
            .map(|(mut n, vars)| {
                renamed(&mut n, &mapping);
                (n, vars)
            })
            .collect();
        for (name, args) in parsed.applications.values_mut() {
            renamed(name, &mapping);
            for t in args {
                ty(t, &mapping);
            }
        }
        for (input, output) in parsed.callback_types.values_mut() {
            ty(input, &mapping);
            ty(output, &mapping);
        }
        parsed.payload_enums = parsed
            .payload_enums
            .into_iter()
            .map(|(mut n, v)| {
                renamed(&mut n, &mapping);
                (n, v)
            })
            .collect();
        for arms in parsed.matches.values_mut() {
            for (root, _, _) in arms {
                renamed(root, &mapping);
            }
        }
        Ok(parsed)
    }
}
fn source_diagnostic(node: &Node, mapping: &[usize], error: String) -> String {
    let Some((message, position)) = error.rsplit_once(" at byte ") else {
        return format!("{}: {error}", node.path.display());
    };
    let token = position.split_whitespace().next().unwrap_or("");
    let Some(offset) = token
        .parse::<usize>()
        .ok()
        .and_then(|n| mapping.get(n).copied())
    else {
        return format!("{}: {error}", node.path.display());
    };
    positioned_diagnostic(node, offset, message)
}
fn positioned_diagnostic(node: &Node, offset: usize, message: &str) -> String {
    let offset = (0..=offset)
        .rev()
        .find(|n| node.text.is_char_boundary(*n))
        .unwrap_or(0);
    let before = &node.text[..offset];
    let line = before.bytes().filter(|b| *b == b'\n').count() + 1;
    let column = before.rsplit('\n').next().unwrap_or("").chars().count() + 1;
    let excerpt = node.text[offset..].split('\n').next().unwrap_or("");
    format!(
        "{}:{line}:{column}: {message}\n  {excerpt}",
        node.path.display()
    )
}
// The semantic checker remains authoritative. On failure, repeat its public
// function inference only to identify a declaration that produced that same
// error. This does not accept, repair or alter the linked program.
fn function_error_origin<'a>(
    loader: &'a Loader,
    program: &Program,
    error: &str,
) -> Option<(&'a Node, usize)> {
    for function in &program.functions {
        let result = check::params_env(&function.params)
            .and_then(|env| check::infer_as(&function.body, &env, program, &function.result));
        if result.err().as_deref() != Some(error) {
            continue;
        }
        for (index, node) in loader.nodes.iter().enumerate() {
            for (original, linked) in names(node, index == 0) {
                if linked != function.name {
                    continue;
                }
                for pair in node.tokens.windows(2) {
                    if pair[0].text == "fn" && pair[1].text == original {
                        return Some((node, pair[0].start));
                    }
                }
            }
        }
    }
    None
}
pub fn load(path: impl AsRef<Path>) -> LangResult<Loaded> {
    load_impl(path,false)
}
/// Source assembly for exporting unproved termination obligations. This returns
/// raw Program data, never a CheckedModule or executable admission witness.
pub fn load_for_termination(path:impl AsRef<Path>)->LangResult<Loaded> {
    load_impl(path,true)
}
fn load_impl(path:impl AsRef<Path>,authoring:bool)->LangResult<Loaded> {
    let mut loader = Loader {
        nodes: vec![],
        indices: BTreeMap::new(),
        active: BTreeSet::new(),
        modules: BTreeMap::new(),
        total: 0,
    };
    loader.visit(path.as_ref().into())?;
    let mut surface = loader.program(0)?;
    let program = &mut surface.program;
    if program.module.contains('.') {
        program.module = format!("ink_module_{:x}", Sha256::digest(program.module.as_bytes()));
    }
    let mut displays = vec![];
    for i in 1..loader.nodes.len() {
        let parsed = loader.program(i)?;
        surface.abstract_records.extend(parsed.abstract_records);
        for (name,origin) in parsed.access_origins {
            if surface.access_origins.get(&name).is_some_and(|previous|previous!=&origin) {
                return Err("source origin collision".into());
            }
            surface.access_origins.insert(name,origin);
        }
        surface.aliases.extend(parsed.aliases);
        surface.parameters.extend(parsed.parameters);
        surface.applications.extend(parsed.applications);
        surface.callback_types.extend(parsed.callback_types);
        surface.payload_enums.extend(parsed.payload_enums);
        surface.matches.extend(parsed.matches);
        surface
            .constant_parameters
            .extend(parsed.constant_parameters);
        let p = parsed.program;
        program.contracts.specifications.extend(p.contracts.specifications);
        program.contracts.implementations.extend(p.contracts.implementations);
        program.contracts.invariants.extend(p.contracts.invariants);
        program.contracts.private_states.extend(p.contracts.private_states);
        program.contracts.learning.trainable.extend(p.contracts.learning.trainable);
        program.contracts.learning.adaptive.extend(p.contracts.learning.adaptive);
        program.contracts.learning.learn.extend(p.contracts.learning.learn);
        program.contracts.value_invariants.extend(p.contracts.value_invariants);
        program.termination.measures.extend(p.termination.measures);
        program.functions.extend(p.functions);
        program.actions.extend(p.actions);
        program.rules.extend(p.rules);
        program.ids.extend(p.ids);
        program.states.extend(p.states);
        program.keeps.extend(p.keeps);
        for (n, v) in p.records {
            if program.records.insert(n.clone(), v).is_some() {
                return Err(format!("linked record collision {n}"));
            }
        }
        for (n, v) in p.enums {
            if program.enums.insert(n.clone(), v).is_some() {
                return Err(format!("linked enum collision {n}"));
            }
        }
        for (n, v) in p.events {
            if program.events.insert(n.clone(), v).is_some() {
                return Err(format!("linked event collision {n}"));
            }
        }
        for (original, linked) in names(&loader.nodes[i], false) {
            displays.push((linked, format!("{}.{}", loader.nodes[i].module, original)));
        }
    }
    let program = surface
        .elaborate()
        .map_err(|e| format!("{}: {e}", loader.nodes[0].path.display()))?;
    (if authoring {check::check_termination_source(&program)} else {check::check(&program)}).map_err(|mut e| {
        let origin = function_error_origin(&loader, &program, &e);
        for (linked, display) in &displays {
            e = e.replace(linked, display);
        }
        if let Some((node, offset)) = origin {
            positioned_diagnostic(node, offset, &e)
        } else {
            format!("{}: {e}", loader.nodes[0].path.display())
        }
    })?;
    let files = loader
        .nodes
        .iter()
        .map(|n| SourceFile {
            path: n.path.clone(),
            module: n.module.clone(),
            sha256: format!("{:x}", Sha256::digest(n.text.as_bytes())),
            source: n.text.clone(),
        })
        .collect();
    Ok(Loaded { program, files })
}
