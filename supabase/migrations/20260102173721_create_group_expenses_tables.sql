-- Create groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name)
);

-- Create group_members table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id),
  UNIQUE(group_id, username)
);

-- Create group_expenses table
CREATE TABLE public.group_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  category_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_expenses ENABLE ROW LEVEL SECURITY;

-- Groups policies
CREATE POLICY "Users can view groups they are members of"
ON public.groups
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM public.group_members WHERE group_id = groups.id
  )
);

CREATE POLICY "Users can create groups"
ON public.groups
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups"
ON public.groups
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Group creators can delete their groups"
ON public.groups
FOR DELETE
USING (auth.uid() = created_by);

-- Group members policies
CREATE POLICY "Users can view members of groups they belong to"
ON public.group_members
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM public.group_members gm WHERE gm.group_id = group_members.group_id
  )
);

CREATE POLICY "Group members can add new members"
ON public.group_members
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.group_members WHERE group_id = group_members.group_id
  )
);

CREATE POLICY "Users can leave groups"
ON public.group_members
FOR DELETE
USING (auth.uid() = user_id);

-- Group expenses policies
CREATE POLICY "Group members can view all group expenses"
ON public.group_expenses
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM public.group_members WHERE group_id = group_expenses.group_id
  )
);

CREATE POLICY "Group members can add expenses"
ON public.group_expenses
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.group_members WHERE group_id = group_expenses.group_id
  ) AND auth.uid() = user_id
);

CREATE POLICY "Users can update their own group expenses"
ON public.group_expenses
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM public.group_members WHERE group_id = group_expenses.group_id
  ) AND auth.uid() = user_id
);

CREATE POLICY "Users can delete their own group expenses"
ON public.group_expenses
FOR DELETE
USING (
  auth.uid() IN (
    SELECT user_id FROM public.group_members WHERE group_id = group_expenses.group_id
  ) AND auth.uid() = user_id
);

-- Add foreign key constraints
ALTER TABLE public.group_members
ADD CONSTRAINT fk_group_members_group_id
FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE public.group_members
ADD CONSTRAINT fk_group_members_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.group_expenses
ADD CONSTRAINT fk_group_expenses_group_id
FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE public.group_expenses
ADD CONSTRAINT fk_group_expenses_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.group_expenses
ADD CONSTRAINT fk_group_expenses_category_id
FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX idx_group_expenses_group_id ON public.group_expenses(group_id);
CREATE INDEX idx_group_expenses_user_id ON public.group_expenses(user_id);
CREATE INDEX idx_groups_created_by ON public.groups(created_by);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_expenses_updated_at
BEFORE UPDATE ON public.group_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
