from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

app = Flask(__name__)

# Database Configuration
# Store SQLite db in the current directory
db_path = os.path.join(os.path.dirname(__file__), 'tasks.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Task Model
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    due_date = db.Column(db.String(10), nullable=True)  # YYYY-MM-DD
    priority = db.Column(db.String(10), default='Medium')  # High, Medium, Low
    is_completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description or '',
            'due_date': self.due_date or '',
            'priority': self.priority,
            'is_completed': self.is_completed,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

# Create Tables
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    # Show active (uncompleted) tasks first, sorted by due date, then completed tasks
    tasks = Task.query.order_by(
        Task.is_completed.asc(), 
        Task.due_date.asc(), 
        Task.id.desc()
    ).all()
    return jsonify([task.to_dict() for task in tasks])

@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.get_json()
    if not data or 'title' not in data or not data['title'].strip():
        return jsonify({'error': 'タイトルを入力してください。'}), 400
        
    new_task = Task(
        title=data['title'].strip(),
        description=data.get('description', '').strip(),
        due_date=data.get('due_date', None) or None,
        priority=data.get('priority', 'Medium'),
        is_completed=False
    )
    
    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.get_json()
    
    if 'title' in data:
        if not data['title'].strip():
            return jsonify({'error': 'タイトルを入力してください。'}), 400
        task.title = data['title'].strip()
        
    if 'description' in data:
        task.description = data['description'].strip()
        
    if 'due_date' in data:
        task.due_date = data['due_date'] or None
        
    if 'priority' in data:
        task.priority = data['priority']
        
    if 'is_completed' in data:
        task.is_completed = data['is_completed']
        
    db.session.commit()
    return jsonify(task.to_dict())

@app.route('/api/tasks/<int:task_id>/toggle', methods=['POST'])
def toggle_task(task_id):
    task = Task.query.get_or_404(task_id)
    task.is_completed = not task.is_completed
    db.session.commit()
    return jsonify(task.to_dict())

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'result': 'Task deleted successfully'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
