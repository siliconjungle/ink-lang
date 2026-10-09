//! Trusted native storage primitives. Included verbatim in generated applications.
//! Buffers maintain unique ascending keys; values()/iter() preserve Table ordering.
//! This implementation is tested against BTreeMap, not mechanically verified.
use std::{cell::Cell, collections::BTreeMap};

pub struct OrderedStorage<K, V> {
    representation: Representation<K, V>,
}
enum Representation<K, V> {
    Rows {
        entries: Vec<(K, V)>,
        hint: Cell<usize>,
        promote_at: Option<usize>,
    },
    Columns {
        keys: Vec<K>,
        hint: Cell<usize>,
        values: Vec<V>,
        promote_at: Option<usize>,
    },
    Tree(BTreeMap<K, V>),
}
impl<K: Ord, V> OrderedStorage<K, V> {
    pub fn rows(promote_at: Option<usize>) -> Self {
        Self {
            representation: Representation::Rows {
                entries: Vec::new(),
                hint: Cell::new(usize::MAX),
                promote_at,
            },
        }
    }
    pub fn columns(promote_at: Option<usize>) -> Self {
        Self {
            representation: Representation::Columns {
                keys: Vec::new(),
                hint: Cell::new(usize::MAX),
                values: Vec::new(),
                promote_at,
            },
        }
    }
    pub fn len(&self) -> usize {
        match &self.representation {
            Representation::Rows { entries, .. } => entries.len(),
            Representation::Columns { keys, .. } => keys.len(),
            Representation::Tree(t) => t.len(),
        }
    }
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
    pub fn get(&self, key: &K) -> Option<&V> {
        match &self.representation {
            Representation::Rows { entries, hint, .. } => {
                let i = Self::row_position(entries, key, hint).ok();
                hint.set(i.unwrap_or(usize::MAX));
                i.map(|i| &entries[i].1)
            }
            Representation::Columns {
                keys, values, hint, ..
            } => {
                let i = Self::column_position(keys, key, hint).ok();
                hint.set(i.unwrap_or(usize::MAX));
                i.map(|i| &values[i])
            }
            Representation::Tree(t) => t.get(key),
        }
    }
    fn row_position(entries: &[(K, V)], key: &K, hint: &Cell<usize>) -> Result<usize, usize> {
        let i = hint.get();
        if entries.get(i).is_some_and(|(k, _)| k == key) {
            Ok(i)
        } else {
            entries.binary_search_by(|(k, _)| k.cmp(key))
        }
    }
    fn column_position(keys: &[K], key: &K, hint: &Cell<usize>) -> Result<usize, usize> {
        let i = hint.get();
        if keys.get(i).is_some_and(|k| k == key) {
            Ok(i)
        } else {
            keys.binary_search(key)
        }
    }
    pub fn contains_key(&self, key: &K) -> bool {
        self.get(key).is_some()
    }
    pub fn get_mut(&mut self, key: &K) -> Option<&mut V> {
        match &mut self.representation {
            Representation::Rows { entries, hint, .. } => {
                let i = Self::row_position(entries, key, hint).ok();
                hint.set(i.unwrap_or(usize::MAX));
                i.map(|i| &mut entries[i].1)
            }
            Representation::Columns {
                keys, values, hint, ..
            } => {
                let i = Self::column_position(keys, key, hint).ok();
                hint.set(i.unwrap_or(usize::MAX));
                i.map(|i| &mut values[i])
            }
            Representation::Tree(t) => t.get_mut(key),
        }
    }
    pub fn insert(&mut self, key: K, value: V) -> Option<V> {
        match &mut self.representation {
            Representation::Rows {
                entries,
                hint,
                promote_at,
            } => match Self::row_position(entries, &key, hint) {
                Ok(i) => {
                    hint.set(i);
                    Some(std::mem::replace(&mut entries[i].1, value))
                }
                Err(i) => {
                    hint.set(usize::MAX);
                    if promote_at.is_some_and(|limit| entries.len() >= limit) {
                        let mut tree: BTreeMap<K, V> =
                            std::mem::take(entries).into_iter().collect();
                        let old = tree.insert(key, value);
                        self.representation = Representation::Tree(tree);
                        old
                    } else {
                        entries.insert(i, (key, value));
                        None
                    }
                }
            },
            Representation::Columns {
                keys,
                hint,
                values,
                promote_at,
            } => match Self::column_position(keys, &key, hint) {
                Ok(i) => {
                    hint.set(i);
                    Some(std::mem::replace(&mut values[i], value))
                }
                Err(i) => {
                    hint.set(usize::MAX);
                    if promote_at.is_some_and(|limit| keys.len() >= limit) {
                        let mut tree: BTreeMap<K, V> = std::mem::take(keys)
                            .into_iter()
                            .zip(std::mem::take(values))
                            .collect();
                        let old = tree.insert(key, value);
                        self.representation = Representation::Tree(tree);
                        old
                    } else {
                        // Reserve both before changing either length. Allocation failure
                        // remains the same aborting host-resource boundary as Vec/BTreeMap.
                        keys.reserve(1);
                        values.reserve(1);
                        keys.insert(i, key);
                        values.insert(i, value);
                        None
                    }
                }
            },
            Representation::Tree(t) => t.insert(key, value),
        }
    }
    pub fn remove(&mut self, key: &K) -> Option<V> {
        match &mut self.representation {
            Representation::Rows { entries, hint, .. } => {
                let i = Self::row_position(entries, key, hint).ok();
                hint.set(usize::MAX);
                i.map(|i| entries.remove(i).1)
            }
            Representation::Columns {
                keys, values, hint, ..
            } => {
                let i = Self::column_position(keys, key, hint).ok();
                hint.set(usize::MAX);
                i.map(|i| {
                    keys.remove(i);
                    values.remove(i)
                })
            }
            Representation::Tree(t) => t.remove(key),
        }
    }
    pub fn iter(&self) -> OrderedIter<'_, K, V> {
        match &self.representation {
            Representation::Rows { entries, .. } => OrderedIter::Rows(entries.iter()),
            Representation::Columns { keys, values, .. } => {
                OrderedIter::Columns(keys.iter().zip(values.iter()))
            }
            Representation::Tree(t) => OrderedIter::Tree(t.iter()),
        }
    }
    pub fn values(&self) -> impl Iterator<Item = &V> {
        self.iter().map(|(_, v)| v)
    }
    /// Storage accounting, separate from process RSS or allocator instrumentation.
    /// Tree allocation size is deliberately unavailable rather than guessed.
    pub fn buffer_bytes(&self) -> Option<usize> {
        match &self.representation {
            Representation::Rows { entries, .. } => {
                Some(entries.capacity() * std::mem::size_of::<(K, V)>())
            }
            Representation::Columns { keys, values, .. } => Some(
                keys.capacity() * std::mem::size_of::<K>()
                    + values.capacity() * std::mem::size_of::<V>(),
            ),
            Representation::Tree(_) => None,
        }
    }
    pub fn is_tree(&self) -> bool {
        matches!(&self.representation, Representation::Tree(_))
    }
}
pub enum OrderedIter<'a, K, V> {
    Rows(std::slice::Iter<'a, (K, V)>),
    Columns(std::iter::Zip<std::slice::Iter<'a, K>, std::slice::Iter<'a, V>>),
    Tree(std::collections::btree_map::Iter<'a, K, V>),
}
impl<'a, K, V> Iterator for OrderedIter<'a, K, V> {
    type Item = (&'a K, &'a V);
    fn next(&mut self) -> Option<Self::Item> {
        match self {
            Self::Rows(i) => i.next().map(|(k, v)| (k, v)),
            Self::Columns(i) => i.next(),
            Self::Tree(i) => i.next(),
        }
    }
    fn size_hint(&self) -> (usize, Option<usize>) {
        match self {
            Self::Rows(i) => i.size_hint(),
            Self::Columns(i) => i.size_hint(),
            Self::Tree(i) => i.size_hint(),
        }
    }
}
impl<K, V> ExactSizeIterator for OrderedIter<'_, K, V> {}
