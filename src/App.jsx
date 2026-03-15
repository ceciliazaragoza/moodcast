import "./App.css";
import profileIcon from "./assets/pfp.jpg";

function App() {
  return (
    <div className="container">
      {/* Profile picture top-right */}
      <div className="topRightProfile">
      <span className="username">Kate</span>
      <img src={profileIcon} alt="profile" className="topRightIcon" />
      </div>
      <main>
      {/* Left side */}
      <div className="left">
        <div className="leftContent">
          <h1>Moodcast</h1>
          <h2>test</h2>

          {/* Three tasks */}
          <div className="tasks">
            <label>
              <input type="checkbox" />
              <span>Task Name</span>
            </label>
          </div>

          <div className="tasks">
            <label>
              <input type="checkbox" />
              <span>Task Name</span>
            </label>
          </div>

          <div className="tasks">
            <label>
              <input type="checkbox" />
              <span>Task Name</span>
            </label>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="right">
        kate
      </div>
    </main>
    </div>
    
  );
}

export default App;
