-- CoBuild subcontractor role patch
-- Run this in Supabase SQL Editor.

alter type user_role add value if not exists 'subcontractor';
