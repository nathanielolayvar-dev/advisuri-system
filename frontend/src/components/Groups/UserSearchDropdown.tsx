import { useState, useEffect } from 'react';
import api from '../../api';

interface User {
  id: number;
  username: string;
}

interface Props {
  groupId: number;
  currentMembers: number[];
  onMemberAdded: () => void;
}

export const UserSearchDropdown = ({
  groupId,
  currentMembers,
  onMemberAdded,
}: Props) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    // Fetch users that match the query
    api.get(`/api/users/?search=${query}`).then((res) => {
      // Filter out users who are already in the group
      const filtered = res.data.filter(
        (u: User) => !currentMembers.includes(u.id)
      );
      setResults(filtered);
    });
  }, [query, currentMembers]);

  const handleAdd = async (userId: number) => {
    try {
      await api.patch(`/api/groups/${groupId}/`, {
        members: [...currentMembers, userId], // PATCH the members list
      });
      setQuery('');
      onMemberAdded(); // Refresh the group list
    } catch (err) {
      console.error('Failed to add member', err);
    }
  };

  return (
    <div className="user-search-container">
      <input
        type="text"
        placeholder="Search users..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="modal-input" // Reuse your modal styles
      />
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((user) => (
            <li key={user.id} onClick={() => handleAdd(user.id)}>
              {user.username} +
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
