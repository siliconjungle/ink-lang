#[path="support/parity.rs"]mod parity;
#[path="support/document_calls.rs"]mod document_calls;
#[test]
fn document_calls_preserve_historical_forks_duplicates_and_overlaps(){document_calls::check("examples/crdts/tagged_retained_run_text_document_observers.ink","tagged-retained-run-text-document-calls-parity");}
