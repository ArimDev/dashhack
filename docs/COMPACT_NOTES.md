# Compact mentoring cards and explicit note saves

Teams uses one column on phones, two at 1024px, three at 1280px and four at 1536px. Empty originality and project abstract sections are omitted. Existing project details, matrix drafts and note visibility remain intact. The Mentors roster uses up to four columns.

Note text comes before metadata, grows from a compact minimum, and scrolls within long notes. Kanban uses the available page width and can fit two notes side by side inside each status column on large screens. Team names remain prominent; native drag handles and touch status controls are preserved.

Editable notes have a Save note button alongside existing blur/change autosave. Saving and Saved feedback follows the server acknowledgement, including the serialized Teams save queue. Failed writes retain unsaved issue text; revision conflicts reload current server metadata before an explicit retry. Idle refresh pauses while any note has unsaved changes or an active save. Public views remain read-only.

No API, schema, dependency or infrastructure change. Validation: 131 unit tests / 991 assertions; production build with native image packaging; 17 distinct Chromium scenarios across explicit save acknowledgement, Teams/Kanban conflict retries, density/mobile controls, existing Kanban edits/drag/filtering, project detail preservation and team search/navigation. The first new Kanban conflict run raced initial page loading; waiting for the original note before introducing the conflicting write fixed the test, and the rerun passed.
