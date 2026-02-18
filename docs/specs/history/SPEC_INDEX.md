# SPEC_INDEX - Gerenciador da Reuniao Sacramental

## Feature Decomposition

| ID | Feature | RFs | Priority | Dependencies |
|----|---------|-----|----------|--------------|
| F001 | Authentication & Session Management | RF-33, RF-34, RF-35, RF-36 | Must have | - |
| F002 | Multi-tenancy & Ward Management | RN-11, RN-13 | Must have | F001 |
| F003 | Member Management (CRUD) | RF-01, RF-01.1, RF-01.2, RF-02, RF-03 | Must have | F002 |
| F004 | Member Import/Export (CSV) | RF-04, RF-05 | Must have | F003 |
| F005 | Ward Topics Management | RF-06, RF-06.1, RF-06.2, RF-07, RF-08, RF-08.1 | Must have | F002 |
| F006 | General Collections & Import | RF-08.2, RF-08.3 | Must have | F002 |
| F007 | Sunday Type Management (Exceptions) | RF-09, RF-10, RF-11 | Must have | F002 |
| F008 | Speech Management & Assignment | RF-12, RF-13, RF-14, RF-15, RF-16 | Must have | F003, F005, F007 |
| F009 | Home Tab | RF-18, RF-19, RF-20 | Must have | F008 |
| F010 | WhatsApp Integration | RF-20 | Must have | F008 |
| F011 | Real-time Sync | RF-17, RN-08 | Must have | F008 |
| F012 | Meeting Agenda Management | RF-21, RF-21.1, RF-21.2, RF-21.3, RF-21.4 | Must have | F007, F008 |
| F013 | Meeting Actors Management | RF-22 | Must have | F002 |
| F014 | Hymns Catalog & Import | RF-23, RF-23.1 | Must have | F006 |
| F015 | Prayer Selection | RF-24 | Must have | F003 |
| F016 | Presentation Mode | RF-25 | Must have | F012 |
| F017 | Push Notifications | RF-26, RF-27, RF-28, RF-29, RF-30, RF-31, RF-32 | Must have | F008 |
| F018 | User Management (CRUD) | RF-33, RF-34, RF-35, RF-36 | Must have | F001 |
| F019 | Activity Log (History) | RF-37 | Must have | F002 |
| F020 | Internationalization (i18n) | RNF-08, RF-08.3 | Must have | - |
| F021 | Dark/Light Mode | RNF-02 | Must have | - |
| F022 | Offline Support | RNF-05 | Must have | F011 |
| F023 | Permissions & Role-based Access | RN-11 | Must have | F001 |
| F024 | WhatsApp Template | RF-20 | Must have | F010 |

## Feature Groups

### Core Data (F001-F006)
Foundation features: auth, wards, members, topics, collections.

### Sunday & Speech (F007-F008)
Sunday type management, speech lifecycle (assign, status, remove).

### Tabs & Views (F009, F012, F016)
Home tab, Agenda tab, Presentation Mode.

### Communication (F010, F017, F024)
WhatsApp integration, push notifications, templates.

### Infrastructure (F011, F020-F023)
Sync, i18n, theming, offline, permissions.

### Admin & Audit (F013-F015, F018-F019)
Actors, hymns, prayers, user management, activity log.
