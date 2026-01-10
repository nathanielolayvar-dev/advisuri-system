import { useState, useEffect } from 'react';
import api from '../api';
import Note from '../components/Note';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';

function Home() {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [fullName, setFullName] = useState(''); // State for user profile
  const navigate = useNavigate();

  useEffect(() => {
    getUserProfile(); // Fetch profile on load
    getNotes();
  }, []);

  const getUserProfile = () => {
    api
      .get('/api/user/profile/') // Call the endpoint we created in the backend
      .then((res) => {
        // Set the full name from the new backend response key
        setFullName(res.data.name);
      })
      .catch((err) => console.log(err));
  };

  const handleLogout = () => {
    localStorage.clear(); // Clear JWT tokens
    navigate('/login'); // Redirect to login
  };

  const getNotes = () => {
    api
      .get('/api/notes/')
      .then((res) => res.data)
      .then((data) => {
        setNotes(data);
        console.log(data);
      })
      .catch((err) => alert(err));
  };

  const deleteNote = (id) => {
    api
      .delete(`/api/notes/delete/${id}/`)
      .then((res) => {
        if (res.status === 204) alert('Note deleted!');
        else alert('Failed to delete note.');
        getNotes();
      })
      .catch((error) => alert(error));
  };

  const createNote = (e) => {
    e.preventDefault();
    api
      .post('/api/notes/', { content, title })
      .then((res) => {
        if (res.status === 201) alert('Note created!');
        else alert('failed to make a note.');
        getNotes();
        setContent(''); // Clear inputs after success
        setTitle('');
      })
      .catch((err) => alert(err));
  };

  return (
    <div className="home-wrapper">
      {/* User Header Section */}
      <div
        className="user-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '10px',
          background: '#f4f4f4',
        }}
      >
        <span>
          Logged in as: <strong>{fullName || 'Loading...'}</strong>
        </span>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>

      <div>
        <h2>Notes</h2>
        {notes.map((note) => (
          <Note note={note} onDelete={deleteNote} key={note.id} />
        ))}
      </div>

      <div className="create-note-section">
        <h2> Create a Note</h2>
        <form onSubmit={createNote}>
          <label htmlFor="title">Title:</label>
          <br />
          <input
            type="text"
            id="title"
            name="title"
            required
            onChange={(e) => setTitle(e.target.value)}
            value={title}
          />
          <label htmlFor="content">Content:</label>
          <br />
          <textarea
            id="content"
            name="content"
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
          ></textarea>
          <br />
          <input type="submit" value="Submit"></input>
        </form>
      </div>
    </div>
  );
}

export default Home;
