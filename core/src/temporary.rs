//! Owned, invocation-local storage. Aliasing is rejected by the source checker.
//! Cloning these internal handles never copies storage or creates a source borrow.
use std::{cell::RefCell, collections::BTreeMap, rc::Rc};

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct OwnedBuffer<T>(Rc<RefCell<Vec<T>>>);
impl<T: Clone> OwnedBuffer<T> {
    pub fn new(xs: Vec<T>) -> Self {
        Self(Rc::new(RefCell::new(xs)))
    }
    pub fn len(&self) -> u32 {
        self.0
            .borrow()
            .len()
            .try_into()
            .expect("buffer exceeds u32")
    }
    pub fn with_item<R>(&self, i: u32, f: impl FnOnce(Option<&T>) -> R) -> R {
        f(self.0.borrow().get(i as usize))
    }
    pub fn get(&self, i: u32) -> Option<T> {
        self.0.borrow().get(i as usize).cloned()
    }
    /// The independent evaluator materializes this logical readonly view.
    /// Native emission may instead retain a scoped slice of the same owner.
    pub fn range_snapshot(&self,start:u32,count:u32)->Self {
        let xs=self.0.borrow();let start=(start as usize).min(xs.len());
        let count=(count as usize).min(xs.len()-start);
        Self::new(xs[start..start+count].to_vec())
    }
    pub fn set(self, i: u32, value: T) -> Self {
        if let Some(slot) = self.0.borrow_mut().get_mut(i as usize) {
            *slot = value;
        }
        self
    }
    pub fn swap(self, a: u32, b: u32) -> Self {
        {
            let mut xs = self.0.borrow_mut();
            if (a as usize) < xs.len() && (b as usize) < xs.len() {
                xs.swap(a as usize, b as usize);
            }
        }
        self
    }
    pub fn fill_range(self, start: u32, count: u32, value: T) -> Self {
        let mut xs = self.0.borrow_mut();
        let start = (start as usize).min(xs.len());
        let count = (count as usize).min(xs.len() - start);
        xs[start..start + count].fill(value);
        drop(xs);
        self
    }
    pub fn copy_within(self, source: u32, destination: u32, count: u32) -> Self {
        let mut xs = self.0.borrow_mut();
        let source = (source as usize).min(xs.len());
        let destination = (destination as usize).min(xs.len());
        let count = (count as usize)
            .min(xs.len() - source)
            .min(xs.len() - destination);
        // The independent evaluator uses a snapshot; native support instead
        // chooses a safe traversal direction without allocating scratch.
        let copied = xs[source..source + count].to_vec();
        xs[destination..destination + count].clone_from_slice(&copied);
        drop(xs);
        self
    }
    pub fn push(self, value: T) -> Self {
        assert!(self.len() < u32::MAX, "buffer length exhausted");
        self.0.borrow_mut().push(value);
        self
    }
    pub fn pop(self) -> Self {
        self.0.borrow_mut().pop();
        self
    }
    pub fn truncate(self, n: u32) -> Self {
        self.0.borrow_mut().truncate(n as usize);
        self
    }
    pub fn split(self, at: u32) -> (Self, Self) {
        let mut xs = self.freeze();
        let right = xs.split_off((at as usize).min(xs.len()));
        (Self::new(xs), Self::new(right))
    }
    pub fn append(self, other: Self) -> Self {
        let mut xs = self.freeze();
        xs.append(&mut other.freeze());
        Self::new(xs)
    }
    pub fn freeze(self) -> Vec<T> {
        std::mem::take(&mut *self.0.borrow_mut())
    }
}

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct OwnedMap<K: Ord, V>(Rc<RefCell<BTreeMap<K, V>>>);
impl<K: Ord + Clone, V: Clone> OwnedMap<K, V> {
    pub fn new() -> Self {
        Self(Rc::new(RefCell::new(BTreeMap::new())))
    }
    pub fn len(&self) -> u32 {
        self.0.borrow().len().try_into().expect("map exceeds u32")
    }
    pub fn with_value<R>(&self, k: &K, f: impl FnOnce(Option<&V>) -> R) -> R {
        f(self.0.borrow().get(k))
    }
    pub fn with_values<R>(
        &self,
        f: impl FnOnce(std::collections::btree_map::Values<'_, K, V>) -> R,
    ) -> R {
        f(self.0.borrow().values())
    }
    pub fn get(&self, k: &K) -> Option<V> {
        self.0.borrow().get(k).cloned()
    }
    pub fn contains(&self, k: &K) -> bool {
        self.0.borrow().contains_key(k)
    }
    pub fn set(self, k: K, v: V) -> Self {
        self.0.borrow_mut().insert(k, v);
        self
    }
    pub fn remove(self, k: &K) -> Self {
        self.0.borrow_mut().remove(k);
        self
    }
    pub fn keys(&self) -> Vec<K> {
        self.0.borrow().keys().cloned().collect()
    }
    pub fn values(&self) -> Vec<V> {
        self.0.borrow().values().cloned().collect()
    }
}
