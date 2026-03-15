import "./App.css";

function Task({ tasks, taskLoading, onDelete, onToggle }) {
  if (!tasks || tasks.length === 0) {
    return <p>No tasks yet. Add your first one on the right.</p>;
  }

  return (
    <>
      {tasks.map((task) => (
        <div
          className="task-item"
          key={task.id || `${task.created_at}-${task.description}`}
        >
          <label className="tasks">
            <input
              type="checkbox"
              checked={Boolean(task.completed)}
              onChange={(event) => onToggle(task, event.target.checked)}
              disabled={taskLoading}
            />
            <span>{task.description}</span>
          </label>
          <button
            type="button"
            onClick={() => onDelete(task.description)}
            disabled={taskLoading}
          >
            Delete
          </button>
        </div>
      ))}
    </>
  );
}

export default Task;
