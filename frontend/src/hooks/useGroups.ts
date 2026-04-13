import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient'; // adjust path to your client
import { useUser } from './useUser';

export const useGroups = () => {
  const { user } = useUser();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      // Use user_id or id depending on how your useUser hook stores it
      if (!user?.user_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 1. We query the 'groups' table directly
        // 2. We match 'created_by' with the logged-in user's ID
        const { data, error } = await supabase
          .from('groups')
          .select('group_id, group_name, course') // Matches your column names in the image
          .eq('created_by', user.user_id);

        if (error) throw error;

        // Map the data so it matches the "GroupWithMembers" or "id/name" format
        // your frontend expects (changing group_id to id and group_name to name)
        const formattedGroups =
          data?.map((g: any) => ({
            id: g.group_id,
            name: g.group_name,
            course: g.course,
          })) || [];

        setGroups(formattedGroups);
      } catch (err) {
        console.error('Error fetching groups:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [user?.user_id]);

  return { groups, loading };
};
