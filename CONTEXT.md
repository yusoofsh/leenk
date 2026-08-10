# Leenk Domain Language

This glossary defines the language for managing a Leenk instance. Public API compatibility may retain legacy terms.

## Language

**Operator**:
An authenticated owner who manages a Leenk instance.
_Avoid_: User, Admin, Account

**Content Document**:
A logical editable unit of public site content.
_Avoid_: Page, Entry

**Content Revision**:
A saved version of a Content Document.
_Avoid_: Version, Snapshot

**Draft Revision**:
A Content Revision not selected for public use.
_Avoid_: Draft

**Published Revision**:
The one Content Revision of a Content Document selected for public use.
_Avoid_: Published Content

**Archived Revision**:
A retained Content Revision no longer selected for public use.
_Avoid_: Archived Content

**Content Block**:
An ordered typed section within a Content Revision.
_Avoid_: Component, Widget

**Asset**:
A managed uploaded item intended for public delivery.
_Avoid_: File, Static File, R2 Object

**Available**:
An Asset or Shortlink whose access policy currently permits use.
_Avoid_: Active

**Expired**:
An Asset or Shortlink whose access period ended while its stored data remains.
_Avoid_: Inactive

**Deleted**:
An Asset or Shortlink removed from active use; related Activity Entries remain.
_Avoid_: Removed

**Target**:
The single destination of a Shortlink, either an Asset or Internal Route.
_Avoid_: Destination, Redirect Target

**Internal Route**:
A public location within Leenk that can be a Shortlink Target.
_Avoid_: URL, Path

**Shortlink**:
A short code that resolves to exactly one Target and may belong to zero or one Campaign.
_Avoid_: Short URL, Link

**Campaign**:
A reusable attribution group that can contain many Shortlinks.
_Avoid_: Tracking Group, UTM Group

**Active Campaign**:
A Campaign available for new Shortlinks.
_Avoid_: Open Campaign

**Archived Campaign**:
A Campaign retained for historical links and analytics but unavailable for new Shortlinks.
_Avoid_: Closed Campaign

**Engagement Event**:
A privacy-bounded record of a public interaction for aggregate analytics.
_Avoid_: Event, Analytics Event

**Activity Entry**:
A durable record of an authenticated Operator action.
_Avoid_: Event, Audit Event

**Environment**:
An isolated target in which Leenk runs. Leenk has exactly two named Environments: Development Environment and Production Environment.
_Avoid_: Stage

**Development Environment**:
The non-production Environment used for implementation and parity verification.
_Avoid_: Dev, Staging Environment

**Production Environment**:
The live Environment that serves public traffic.
_Avoid_: Prod, Live Environment

**Deployment**:
One applied version of Leenk in an Environment.
_Avoid_: Release, Build
