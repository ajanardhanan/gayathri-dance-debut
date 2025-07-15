import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';

// --- Firebase Context ---
const FirebaseContext = createContext(null);

// Firebase Provider Component
const FirebaseProvider = ({ children }) => {
  const [firebaseApp, setFirebaseApp] = useState(null);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false); // New state to track auth readiness

  useEffect(() => {
    // Check if firebaseConfig and appId are defined globally by the Canvas environment
    const firebaseConfig = typeof __firebase_config !== 'undefined'
      ? JSON.parse(__firebase_config)
      : null;
    // appId is used in collection paths, so it's defined here for consistency
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    if (!firebaseConfig) {
      console.error("Firebase config not found. Please ensure __firebase_config is defined.");
      return;
    }

    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const firebaseAuth = getAuth(app);

    setFirebaseApp(app);
    setDb(firestore);
    setAuth(firebaseAuth);

    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        // Sign in anonymously if no user is logged in and no custom token is provided
        try {
          // Use __initial_auth_token if available, otherwise sign in anonymously
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(firebaseAuth, __initial_auth_token);
          } else {
            await signInAnonymously(firebaseAuth);
          }
        } catch (error) {
          console.error("Error signing in:", error);
          // Fallback to a random UUID if anonymous sign-in fails
          setUserId(crypto.randomUUID());
        }
      }
      setIsAuthReady(true); // Auth is ready after initial check
    });

    return () => unsubscribe(); // Cleanup auth listener on unmount
  }, []);

  return (
    <FirebaseContext.Provider value={{ firebaseApp, db, auth, userId, isAuthReady }}>
      {children}
    </FirebaseContext.Provider>
  );
};

// Custom hook to use Firebase context
const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

// --- Custom Message Box Component (replaces alert/confirm) ---
const MessageBox = ({ message, onConfirm, onCancel, type = 'alert' }) => {
  if (!message) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full text-center">
        <p className="text-lg font-semibold mb-4">{message}</p>
        <div className="flex justify-center space-x-4">
          {type === 'alert' && (
            <button
              onClick={onConfirm}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out"
            >
              OK
            </button>
          )}
          {type === 'confirm' && (
            <>
              <button
                onClick={onCancel}
                className="px-6 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition duration-150 ease-in-out"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition duration-150 ease-in-out"
              >
                Confirm
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Navigation Component ---
const Navbar = ({ setCurrentPage }) => {
  return (
    <nav className="bg-gradient-to-r from-purple-700 to-indigo-800 p-4 shadow-lg">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-white text-3xl font-extrabold mb-2 md:mb-0">
          <span className="font-serif italic">Gayathri's Arangetram</span>
        </h1>
        <div className="flex flex-wrap justify-center md:space-x-6 space-x-2">
          <NavLink onClick={() => setCurrentPage('home')}>Home</NavLink>
          <NavLink onClick={() => setCurrentPage('photos')}>Photos</NavLink>
          <NavLink onClick={() => setCurrentPage('stories')}>Stories</NavLink>
          <NavLink onClick={() => setCurrentPage('addStory')}>Add Story</NavLink> {/* For the daughter */}
          <NavLink onClick={() => setCurrentPage('feedback')}>Feedback</NavLink>
        </div>
      </div>
    </nav>
  );
};

const NavLink = ({ children, onClick }) => (
  <button
    onClick={onClick}
    className="text-white text-lg font-medium px-4 py-2 rounded-full hover:bg-white hover:text-purple-800 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
  >
    {children}
  </button>
);

// --- Hero Section ---
const HeroSection = ({ userId }) => {
  return (
    <section className="relative h-screen bg-cover bg-center flex items-center justify-center text-white"
      style={{ backgroundImage: "url('https://placehold.co/1920x1080/6A0DAD/FFFFFF?text=Gayathri%27s+Dance+Debut')" }}>
      <div className="absolute inset-0 bg-black opacity-60"></div>
      <div className="relative z-10 text-center p-6 rounded-lg bg-opacity-70 bg-purple-900 shadow-2xl">
        <h2 className="text-5xl md:text-7xl font-extrabold mb-4 animate-fade-in-up">
          Gayathri's Arangetram
        </h2>
        <p className="text-xl md:text-2xl font-light mb-6 animate-fade-in-up delay-200">
          A Celebration of Grace, Dedication, and Art
        </p>
        <p className="text-sm text-gray-300">
          Current User ID: <span className="font-mono break-all">{userId || 'Loading...'}</span>
        </p>
      </div>
    </section>
  );
};

// --- Photo Gallery Component ---
const PhotoGallery = () => {
  const photos = [
    'https://lh3.googleusercontent.com/d/1tGaySuh25Zdl-fPVXqJn0j31ALF280Bx',
    'https://lh3.googleusercontent.com/d/1VeOz10dX-dQI02aDx13oWS1z_tvtBgbN',
    'https://lh3.googleusercontent.com/d/1-np-AQ9X-dw36VwGoWeZujm6Oh7JvMMa',
    'https://lh3.googleusercontent.com/d/1u621T8l5MzSqtterd-Jj64VRoSF1uzA3',
    'https://lh3.googleusercontent.com/d/1UNDhwlyFNQnEGgJu--IwAIjwS6AWTknu',
    'https://lh3.googleusercontent.com/d/15SK3ZQdsnS7Uh3xP5EmeC7QAU3lvN5Y6',
    'https://lh3.googleusercontent.com/d/1Ko22kj2vGyFG754PSNlMzw7rxXI158Ix',
    'https://lh3.googleusercontent.com/d/17BdGJYJ4tVdYE5I_EJNfXdaxzz7o06lZ',
    'https://lh3.googleusercontent.com/d/1RXADfURqfbN0buJJiSRUJoLLcApVC2ay',
    'https://lh3.googleusercontent.com/d/1ophdrf7A6v7itSwjtgdTLTXvt4e-s9_Z',
    'https://lh3.googleusercontent.com/d/1N9wwWtheZPxPsh1SSNt1vrapamk-SXQd',
    'https://lh3.googleusercontent.com/d/1mXytV4M7XPxfCh2LnTBsS9JiMX-guGLj',
    'https://lh3.googleusercontent.com/d/17g3IvCPVpvWt14HBQCMfWvfyuBimDi4B'
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center text-purple-800 mb-12">Photo Gallery</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-8">
          {photos.map((src, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden transform transition duration-300 hover:scale-105">
              <img
                src={src}
                alt={`Dance Photo ${index + 1}`}
                className="w-full h-64 object-cover"
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/800x600/CCCCCC/000000?text=Image+Error'; }}
              />
              <div className="p-4">
                <p className="text-gray-700 text-center font-medium">A moment of beauty and expression.</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Stories Section ---
const StoriesList = ({ setCurrentPage, setSelectedStoryId }) => {
  const { db, isAuthReady } = useFirebase();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db || !isAuthReady) return;

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const storiesCollectionRef = collection(db, `artifacts/${appId}/public/data/stories`);
    const q = query(storiesCollectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const fetchedStories = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStories(fetchedStories);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching stories:", err);
        setError("Failed to load stories. Please try again later.");
        setLoading(false);
      }
    );

    return () => unsubscribe(); // Cleanup listener
  }, [db, isAuthReady]);

  if (loading) return <div className="text-center py-16 text-xl text-purple-700">Loading stories...</div>;
  if (error) return <div className="text-center py-16 text-xl text-red-600">{error}</div>;

  return (
    <section className="py-16 bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center text-purple-800 mb-12">Gayathri's Dance Stories</h2>
        {stories.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">No stories yet. Check back soon!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {stories.map(story => (
              <div
                key={story.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden transform transition duration-300 hover:scale-105 cursor-pointer border border-purple-200"
                onClick={() => {
                  setSelectedStoryId(story.id);
                  setCurrentPage('storyDetail');
                }}
              >
                <img
                  src={story.imageUrl || 'https://placehold.co/600x400/DDA0DD/4B0082?text=Story+Image'}
                  alt={story.title}
                  className="w-full h-56 object-cover"
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x400/CCCCCC/000000?text=Image+Error'; }}
                />
                <div className="p-6">
                  <h3 className="text-2xl font-semibold text-purple-700 mb-2">{story.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{story.content}</p>
                  <span className="text-purple-600 font-medium hover:underline">Read More &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// --- Story Detail Component ---
const StoryDetail = ({ storyId, setCurrentPage }) => {
  const { db, userId, isAuthReady } = useFirebase();
  const [story, setStory] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commenterName, setCommenterName] = useState('');
  const [loadingStory, setLoadingStory] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [storyError, setStoryError] = useState(null);
  const [commentError, setCommentError] = useState(null);
  const [messageBox, setMessageBox] = useState({ show: false, message: '', type: 'alert', onConfirm: null, onCancel: null });


  useEffect(() => {
    if (!db || !isAuthReady || !storyId) return;

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // Fetch story details
    const storyDocRef = doc(db, `artifacts/${appId}/public/data/stories`, storyId);
    const fetchStory = async () => {
      try {
        const docSnap = await getDoc(storyDocRef);
        if (docSnap.exists()) {
          setStory({ id: docSnap.id, ...docSnap.data() });
        } else {
          setStoryError("Story not found.");
        }
      } catch (err) {
        console.error("Error fetching story:", err);
        setStoryError("Failed to load story details.");
      } finally {
        setLoadingStory(false);
      }
    };
    fetchStory();

    // Listen for comments
    const commentsCollectionRef = collection(db, `artifacts/${appId}/public/data/comments`);
    const q = query(commentsCollectionRef, orderBy('createdAt', 'asc'));

    const unsubscribeComments = onSnapshot(q,
      (snapshot) => {
        const fetchedComments = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(comment => comment.storyId === storyId); // Filter comments for this specific story
        setComments(fetchedComments);
        setLoadingComments(false);
      },
      (err) => {
        console.error("Error fetching comments:", err);
        setCommentError("Failed to load comments.");
        setLoadingComments(false);
      }
    );

    return () => unsubscribeComments(); // Cleanup comments listener
  }, [db, storyId, isAuthReady]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !commenterName.trim()) {
      setMessageBox({ show: true, message: 'Please enter your name and a comment.', type: 'alert', onConfirm: () => setMessageBox({ show: false }) });
      return;
    }

    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      await addDoc(collection(db, `artifacts/${appId}/public/data/comments`), {
        storyId: storyId,
        commentText: newComment,
        commenterName: commenterName,
        createdAt: serverTimestamp(),
        userId: userId // Store the commenter's user ID
      });
      setNewComment('');
      setCommenterName('');
      setMessageBox({ show: true, message: 'Comment added successfully!', type: 'alert', onConfirm: () => setMessageBox({ show: false }) });
    } catch (error) {
      console.error("Error adding comment:", error);
      setMessageBox({ show: true, message: 'Failed to add comment. Please try again.', type: 'alert', onConfirm: () => setMessageBox({ show: false }) });
    }
  };

  if (loadingStory || loadingComments) return <div className="text-center py-16 text-xl text-purple-700">Loading story...</div>;
  if (storyError) return <div className="text-center py-16 text-xl text-red-600">{storyError}</div>;
  if (!story) return <div className="text-center py-16 text-xl text-gray-600">Story not found.</div>;

  return (
    <section className="py-16 bg-gradient-to-br from-white to-purple-50">
      <div className="container mx-auto px-4 max-w-3xl">
        <button
          onClick={() => setCurrentPage('stories')}
          className="mb-8 px-6 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
        >
          &larr; Back to Stories
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8 border border-purple-200">
          <img
            src={story.imageUrl || 'https://placehold.co/800x500/DDA0DD/4B0082?text=Story+Image'}
            alt={story.title}
            className="w-full h-80 object-cover rounded-lg mb-6 shadow-md"
            onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/800x500/CCCCCC/000000?text=Image+Error'; }}
          />
          <h2 className="text-4xl font-bold text-purple-800 mb-4">{story.title}</h2>
          <p className="text-gray-700 leading-relaxed mb-6 whitespace-pre-wrap">{story.content}</p>
          <p className="text-sm text-gray-500 italic">
            Published by Gayathri on {story.createdAt?.toDate().toLocaleDateString() || 'N/A'}
          </p>
        </div>

        {/* Comments Section */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-8 border border-purple-200">
          <h3 className="text-3xl font-bold text-purple-800 mb-6">Comments</h3>
          {commentError && <p className="text-red-600 mb-4">{commentError}</p>}
          {comments.length === 0 ? (
            <p className="text-gray-600 mb-6">No comments yet. Be the first to leave one!</p>
          ) : (
            <div className="space-y-6 mb-8">
              {comments.map(comment => (
                <div key={comment.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                  <p className="font-semibold text-gray-800">{comment.commenterName}</p>
                  <p className="text-gray-700 mt-1">{comment.commentText}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {comment.createdAt?.toDate().toLocaleString() || 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="space-y-4">
            <h4 className="text-2xl font-semibold text-purple-700 mb-4">Leave a Comment</h4>
            <div>
              <label htmlFor="commenterName" className="block text-gray-700 text-sm font-bold mb-2">
                Your Name:
              </label>
              <input
                type="text"
                id="commenterName"
                value={commenterName}
                onChange={(e) => setCommenterName(e.target.value)}
                className="shadow appearance-none border rounded-md w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                required
              />
            </div>
            <div>
              <label htmlFor="newComment" className="block text-gray-700 text-sm font-bold mb-2">
                Your Comment:
              </label>
              <textarea
                id="newComment"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows="4"
                className="shadow appearance-none border rounded-md w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                required
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full px-6 py-3 bg-purple-600 text-white font-bold rounded-full hover:bg-purple-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
            >
              Post Comment
            </button>
          </form>
        </div>
      </div>
      <MessageBox
        show={messageBox.show}
        message={messageBox.message}
        type={messageBox.type}
        onConfirm={messageBox.onConfirm}
        onCancel={messageBox.onCancel}
      />
    </section>
  );
};

// --- Add Story Form (for daughter) ---
const AddStoryForm = () => {
  const { db, userId, isAuthReady } = useFirebase();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageBox, setMessageBox] = useState({ show: false, message: '', type: 'alert', onConfirm: null });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setMessageBox({ show: true, message: 'Please fill in all required fields.', type: 'alert', onConfirm: () => setMessageBox({ show: false }) });
      return;
    }

    setLoading(true);
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      await addDoc(collection(db, `artifacts/${appId}/public/data/stories`), {
        title,
        content,
        imageUrl: imageUrl || 'https://placehold.co/800x600/DDA0DD/4B0082?text=Default+Story+Image', // Default image if none provided
        authorId: userId, // The daughter's user ID
        createdAt: serverTimestamp()
      });
      setTitle('');
      setContent('');
      setImageUrl('');
      setMessageBox({ show: true, message: 'Story added successfully!', type: 'alert', onConfirm: () => setMessageBox({ show: false }) });
    } catch (error) {
      console.error("Error adding story:", error);
      setMessageBox({ show: true, message: 'Failed to add story. Please try again.', type: 'alert', onConfirm: () => setMessageBox({ show: false }) });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthReady) {
    return <div className="text-center py-16 text-xl text-purple-700">Loading authentication...</div>;
  }

  return (
    <section className="py-16 bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="container mx-auto px-4 max-w-2xl">
        <h2 className="text-4xl font-bold text-center text-purple-800 mb-12">Add New Dance Story</h2>
        <div className="bg-white rounded-xl shadow-lg p-8 border border-purple-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="storyTitle" className="block text-gray-700 text-sm font-bold mb-2">
                Story Title:
              </label>
              <input
                type="text"
                id="storyTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="shadow appearance-none border rounded-md w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                required
              />
            </div>
            <div>
              <label htmlFor="storyContent" className="block text-gray-700 text-sm font-bold mb-2">
                Story Content:
              </label>
              <textarea
                id="storyContent"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows="8"
                className="shadow appearance-none border rounded-md w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                required
              ></textarea>
            </div>
            <div>
              <label htmlFor="imageUrl" className="block text-gray-700 text-sm font-bold mb-2">
                Image URL (Optional):
              </label>
              <input
                type="url"
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="shadow appearance-none border rounded-md w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                placeholder="e.g., https://example.com/your-image.jpg"
              />
            </div>
            <button
              type="submit"
              className="w-full px-6 py-3 bg-purple-600 text-white font-bold rounded-full hover:bg-purple-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Adding Story...' : 'Add Story'}
            </button>
          </form>
        </div>
      </div>
      <MessageBox
        show={messageBox.show}
        message={messageBox.message}
        type={messageBox.type}
        onConfirm={messageBox.onConfirm}
      />
    </section>
  );
};

// --- Feedback Section ---
const Feedback = () => {
  const { db, userId, isAuthReady } = useFirebase();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackError, setFeedbackError] = useState(null);
  const [messageBox, setMessageBox] = useState({ show: false, message: '', type: 'alert', onConfirm: null });

  useEffect(() => {
    if (!db || !isAuthReady) return;

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const feedbackCollectionRef = collection(db, `artifacts/${appId}/public/data/feedback`);
    const q = query(feedbackCollectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const fetchedFeedback = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFeedbackList(fetchedFeedback);
      },
      (err) => {
        console.error("Error fetching feedback:", err);
        setFeedbackError("Failed to load feedback.");
      }
    );

    return () => unsubscribe(); // Cleanup listener
  }, [db, isAuthReady]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      setMessageBox({ show: true, message: 'Please fill in your name and message.', type: 'alert', onConfirm: () => setMessageBox({ show: false }) });
      return;
    }

    setLoading(true);
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      await addDoc(collection(db, `artifacts/${appId}/public/data/feedback`), {
        name,
        email,
        message,
        createdAt: serverTimestamp(),
        userId: userId // Store the feedback giver's user ID
      });
      setName('');
      setEmail('');
      setMessage('');
      setMessageBox({ show: true, message: 'Thank you for your feedback!', type: 'alert', onConfirm: () => setMessageBox({ show: false }) });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setMessageBox({ show: true, message: 'Failed to submit feedback. Please try again.', type: 'alert', onConfirm: () => setMessageBox({ show: false }) });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthReady) {
    return <div className="text-center py-16 text-xl text-purple-700">Loading authentication...</div>;
  }

  return (
    <section className="py-16 bg-gradient-to-br from-indigo-50 to-purple-100">
      <div className="container mx-auto px-4 max-w-3xl">
        <h2 className="text-4xl font-bold text-center text-purple-800 mb-12">Share Your Feedback</h2>
        <div className="bg-white rounded-xl shadow-lg p-8 border border-purple-200 mb-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="feedbackName" className="block text-gray-700 text-sm font-bold mb-2">
                Your Name:
              </label>
              <input
                type="text"
                id="feedbackName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="shadow appearance-none border rounded-md w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                required
              />
            </div>
            <div>
              <label htmlFor="feedbackEmail" className="block text-gray-700 text-sm font-bold mb-2">
                Your Email (Optional):
              </label>
              <input
                type="email"
                id="feedbackEmail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="shadow appearance-none border rounded-md w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label htmlFor="feedbackMessage" className="block text-gray-700 text-sm font-bold mb-2">
                Your Message:
              </label>
              <textarea
                id="feedbackMessage"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows="6"
                className="shadow appearance-none border rounded-md w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                required
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full px-6 py-3 bg-purple-600 text-white font-bold rounded-full hover:bg-purple-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>

        {/* Display Feedback */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-purple-200">
          <h3 className="text-3xl font-bold text-purple-800 mb-6">Recent Feedback</h3>
          {feedbackError && <p className="text-red-600 mb-4">{feedbackError}</p>}
          {feedbackList.length === 0 ? (
            <p className="text-gray-600">No feedback yet. Be the first to share your thoughts!</p>
          ) : (
            <div className="space-y-6">
              {feedbackList.map(item => (
                <div key={item.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                  <p className="font-semibold text-gray-800">{item.name}</p>
                  <p className="text-gray-700 mt-1">{item.message}</p>
                  {item.email && <p className="text-sm text-gray-500 mt-1">Email: {item.email}</p>}
                  <p className="text-xs text-gray-500 mt-2">
                    {item.createdAt?.toDate().toLocaleString() || 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <MessageBox
        show={messageBox.show}
        message={messageBox.message}
        type={messageBox.type}
        onConfirm={messageBox.onConfirm}
      />
    </section>
  );
};

// --- Main App Content Component (wraps the core logic that uses Firebase context) ---
const MainAppContent = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedStoryId, setSelectedStoryId] = useState(null);
  const { userId, isAuthReady, db } = useFirebase(); // Now correctly inside FirebaseProvider's child

  // Function to add sample data (for initial setup)
  const addSampleData = async () => {
    if (!isAuthReady || !userId || !db) { // Ensure db is also available
      console.log("Auth not ready, userId not available, or db not initialized for sample data.");
      return;
    }

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // Check if stories already exist to prevent duplicates on refresh
    const storiesCollectionRef = collection(db, `artifacts/${appId}/public/data/stories`);
    const storiesSnapshot = await getDoc(doc(storiesCollectionRef, 'sample-story-1')); // Check for a specific sample story

    if (storiesSnapshot.exists()) {
      console.log("Sample data already exists. Skipping insertion.");
      return;
    }

    console.log("Adding sample data...");

    // Sample Stories
    const sampleStories = [
      {
        id: 'sample-story-1',
        title: "My First Steps in Bharatanatyam",
        content: `I remember my first Bharatanatyam class like it was yesterday. The vibrant colors of the studio, the rhythmic beats of the natuvangam, and the graceful movements of my teacher captivated me instantly. I was just five years old, and the world of classical dance opened up before me.

Learning the basic adavus (steps) felt challenging at first, but with each practice, I felt a growing connection to this ancient art form. The intricate hand gestures (mudras) and facial expressions (abhinaya) fascinated me, allowing me to tell stories without words. My teacher, Guru Smt. Padma Devi, always emphasized the importance of bhavam (expression) and laya (rhythm).

One of my earliest memories is performing a short piece at a local community event. I was nervous, but the applause and encouragement from the audience filled me with immense joy. It was then I knew that dance would be a significant part of my life's journey. This art form has taught me discipline, patience, and the beauty of storytelling through movement.`,
        imageUrl: 'https://placehold.co/800x600/FFD700/8B4513?text=First+Steps',
        authorId: userId,
        createdAt: serverTimestamp()
      },
      {
        id: 'sample-story-2',
        title: "The Joy of Expressing Emotions",
        content: `Bharatanatyam is not just about steps and poses; it's about conveying emotions and narratives. I've always found immense joy in the abhinaya aspect of the dance. Being able to portray different characters – from a mischievous Krishna to a loving Yashoda, or a fierce Durga – allows me to explore a spectrum of human feelings.

One particular piece, a Varnam, truly challenged me to delve deep into emotional expression. It required me to switch between various moods and characters rapidly, demanding both technical precision and emotional depth. It was exhausting but incredibly rewarding. The audience's reactions, especially when they connected with the story I was telling, made every hour of practice worthwhile.

Dance has become my language, a way to communicate what words sometimes cannot. It's a journey of self-discovery and a continuous learning process, always pushing me to refine my craft and connect more deeply with the art.`,
        imageUrl: 'https://placehold.co/800x600/ADD8E6/000080?text=Expressing+Emotions',
        authorId: userId,
        createdAt: serverTimestamp()
      },
      {
        id: 'sample-story-3',
        title: "Preparing for My Arangetram",
        content: `The Arangetram, my solo debut performance, is a monumental milestone in a Bharatanatyam dancer's life. The preparations have been intense, filled with countless hours of practice, refining every movement, every expression. My days are a blend of school, homework, and rigorous dance rehearsals.

There's a mix of excitement and nervousness. I'm excited to present years of learning and dedication on stage, to share my passion with family and friends. But there's also the pressure to perform flawlessly, to honor my Guru and the art form itself.

My parents have been incredibly supportive, driving me to classes, helping me with costumes, and cheering me on. My Guru has guided me with immense patience and wisdom, pushing me to my limits while nurturing my artistic growth. This journey has been a testament to perseverance, and I can't wait to step onto that stage and offer my heartfelt performance.`,
        imageUrl: 'https://placehold.co/800x600/98FB98/228B22?text=Arangetram+Prep',
        authorId: userId,
        createdAt: serverTimestamp()
      }
    ];

    // Sample Feedback
    const sampleFeedback = [
      {
        name: "Priya Sharma",
        email: "priya.s@example.com",
        message: "Gayathri, your dedication shines through! Wishing you all the best for your debut.",
        createdAt: serverTimestamp(),
        userId: 'sample-user-1'
      },
      {
        name: "Rajesh Kumar",
        email: "",
        message: "Such a talented young dancer. Looking forward to seeing your photos and stories!",
        createdAt: serverTimestamp(),
        userId: 'sample-user-2'
      }
    ];

    // Sample Comments for 'My First Steps in Bharatanatyam'
    const sampleCommentsStory1 = [
      {
        storyId: 'sample-story-1',
        commentText: "This is so inspiring, Gayathri! Keep dancing!",
        commenterName: "Auntie Meena",
        createdAt: serverTimestamp(),
        userId: 'sample-user-3'
      },
      {
        storyId: 'sample-story-1',
        commentText: "What a beautiful journey! Your passion is evident.",
        commenterName: "Dance Lover",
        createdAt: serverTimestamp(),
        userId: 'sample-user-4'
      }
    ];

    try {
      // Add stories
      for (const story of sampleStories) {
        await setDoc(doc(storiesCollectionRef, story.id), story); // Use setDoc with ID to avoid duplicates
      }
      // Add feedback
      for (const feedback of sampleFeedback) {
        const feedbackCollectionRef = collection(db, `artifacts/${appId}/public/data/feedback`);
        await addDoc(feedbackCollectionRef, feedback);
      }
      // Add comments
      for (const comment of sampleCommentsStory1) {
        const commentsCollectionRef = collection(db, `artifacts/${appId}/public/data/comments`);
        await addDoc(commentsCollectionRef, comment);
      }
      console.log("Sample data added successfully!");
    } catch (error) {
      console.error("Error adding sample data:", error);
    }
  };

  useEffect(() => {
    if (isAuthReady && userId && db) { // Ensure db is available before trying to add data
      addSampleData();
    }
  }, [isAuthReady, userId, db]); // Rerun when auth is ready, userId, or db changes

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HeroSection userId={userId} />;
      case 'photos':
        return <PhotoGallery />;
      case 'stories':
        return <StoriesList setCurrentPage={setCurrentPage} setSelectedStoryId={setSelectedStoryId} />;
      case 'storyDetail':
        return <StoryDetail storyId={selectedStoryId} setCurrentPage={setCurrentPage} />;
      case 'addStory':
        return <AddStoryForm />;
      case 'feedback':
        return <Feedback />;
      default:
        return <HeroSection userId={userId} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 font-sans">
      <Navbar setCurrentPage={setCurrentPage} />
      <main className="flex-grow">
        {renderPage()}
      </main>
      <footer className="bg-gray-800 text-white py-6 text-center text-sm">
        <div className="container mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} Gayathri's Dance Debut. All rights reserved.</p>
          <p className="mt-2">Built with ❤️ for a beautiful journey.</p>
        </div>
      </footer>
    </div>
  );
};

// --- Main App Component ---
const App = () => {
  // Inject Tailwind CSS
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.tailwindcss.com';
    document.head.appendChild(script);

    // Add Inter font
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Apply Inter font to body
    document.body.style.fontFamily = "'Inter', sans-serif";

    return () => {
      document.head.removeChild(script);
      document.head.removeChild(link);
    };
  }, []);

  return (
    <FirebaseProvider>
      <MainAppContent /> {/* Main content now wrapped by FirebaseProvider */}
    </FirebaseProvider>
  );
};

export default App;
