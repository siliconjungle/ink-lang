module support_triage;
// A task that orchestrates external effects around exact Ink state.
//
// `fetch_ticket`, `lookup_customer`, `classify` and `summarise` are requests a
// host performs (an HTTP call, a database, a language model). Their replies
// re-enter Ink only through the declared types. `classify` and `summarise`
// carry contracts: a reply that fails its `ensures` predicate, does not decode
// to the declared type, or fails outright is replaced by the authored `else`
// value. `notify` is `ordered`: it runs only after every earlier step, so a
// failed write never sends a notification.
//
// After `fetch_ticket`, the customer lookup, classification and summary depend
// only on the ticket, so hosts run them concurrently. `record` and `notify`
// run in source order. The result equals sequential execution with the same
// effect replies, which is how recorded traces replay.
enum Label { Bug, Billing, Question, Other, }
record Ticket { id: u32, customer: String, text: String, }
record Customer { name: String, plan: String, }

effect fetch_ticket(id: u32) -> Result<Ticket, String>;
effect lookup_customer(name: String) -> Option<Customer>;
effect classify(text: String, labels: List<Label>) -> Label;
effect summarise(text: String) -> String;
ordered effect notify(channel: String, message: String) -> Result<Unit, String>;

state Labels: Table<u32, Label> = Table.empty();
state Triaged: u32 = 0;

// The authored rule used when the model's label is rejected.
fn rule_label(text: String) -> Label {
  return choose(string_byte_len(text) == 0, Label.Other, Label.Question);
}
fn plan_of(customer: Option<Customer>) -> String {
  return customer.fold(fn(c)=>c.plan, fn(none)=>"free");
}

change record(id: u32, label: Label) -> Result<u32, String> writes(Labels, Triaged) {
  Labels.put(id, label);
  Triaged = Triaged + 1;
  return Ok(Triaged);
}
query label_of(id: u32) -> Option<Label> reads(Labels) { return Labels.get(id); }
query triaged() -> u32 reads(Triaged) { return Triaged; }

task triage(id: u32) -> Result<Label, String> {
  let ticket = fetch_ticket(id)?;
  let customer = lookup_customer(ticket.customer);
  let label = classify(ticket.text, [Label.Bug, Label.Billing, Label.Question])
    ensures label != Label.Other else rule_label(ticket.text);
  let summary = summarise(ticket.text)
    ensures string_byte_len(summary) <= 140 else "";
  let plan: String = plan_of(customer);
  let count = record(id, label)?;
  notify(choose(plan == "enterprise", "priority", "queue"), summary)?;
  return Ok(label);
}
