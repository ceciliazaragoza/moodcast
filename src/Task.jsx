import "./App.css";

function Task({ tasks, taskLoading, onDelete }) {
  if (!tasks || tasks.length === 0) {
    return <p>No tasks yet. Add your first one on the right.</p>;
  }

  return (
    <>
      {tasks.map((task) => (
        <div
          className="task-item"
          key={`${task.created_at}-${task.description}`}
        >
          <label className="tasks">
            <input type="checkbox" checked={Boolean(task.completed)} readOnly />
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
