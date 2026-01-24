-- Fix existing groups without creator as member
INSERT INTO public.group_members (group_id, user_id, username)
SELECT g.id, g.created_by, COALESCE(p.display_name, 'User')
FROM public.groups g
LEFT JOIN public.group_members gm ON g.id = gm.group_id AND g.created_by = gm.user_id
LEFT JOIN public.profiles p ON g.created_by = p.user_id
WHERE gm.id IS NULL
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Create trigger to auto-add creator as member when group is created
CREATE OR REPLACE FUNCTION public.add_creator_to_group()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, username)
  VALUES (NEW.id, NEW.created_by, COALESCE(
    (SELECT display_name FROM public.profiles WHERE user_id = NEW.created_by),
    'User'
  ))
  ON CONFLICT (group_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_group_created ON public.groups;
CREATE TRIGGER on_group_created
  AFTER INSERT ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.add_creator_to_group();