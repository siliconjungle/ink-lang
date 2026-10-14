#[path="support/parity.rs"]mod parity;
#[path="support/document_calls.rs"]mod document_calls;
#[test]
fn document_calls_preserve_historical_forks_duplicates_and_overlaps(){document_calls::check("examples/crdts/uniform_run_text_document_observers.ink","uniform-run-text-document-calls-parity");}
