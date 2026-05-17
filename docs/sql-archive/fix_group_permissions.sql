-- Enable RLS on group_expenses if not already
ALTER TABLE group_expenses ENABLE ROW LEVEL SECURITY;

-- Allow members to INSERT expenses
CREATE POLICY "Members can add expenses" ON group_expenses
  FOR INSERT
  USING (
    auth.uid() IN (
      SELECT user_id FROM group_members
      WHERE group_id = group_expenses.group_id
    )
  );

-- Allow members to VIEW (SELECT) expenses
CREATE POLICY "Members can view expenses" ON group_expenses
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM group_members
      WHERE group_id = group_expenses.group_id
    )
  );

-- Allow members to DELETE their OWN expenses
CREATE POLICY "Users can delete their own expenses" ON group_expenses
  FOR DELETE
  USING (
    auth.uid() = user_id
  );

-- Allow VIEWing group members (needed for the check above)
CREATE POLICY "Members can view other members" ON group_members
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM group_members gm 
      WHERE gm.group_id = group_members.group_id
    )
  );
