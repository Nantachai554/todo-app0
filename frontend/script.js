let token = localStorage.getItem('token');
let currentEditId;

if (token) {
    document.getElementById('auth').style.display = 'none';
    document.getElementById('todo').style.display = 'block';
    document.getElementById('username').textContent = localStorage.getItem('username');
    loadTasks();
}

function register() {
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    if (!username || !password) {
        alert('กรุณาระบุ username และ password');
        return;
    }
    fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'สมัครสมาชิกสำเร็จ') {
                alert('สมัครสมาชิกสำเร็จ กรุณาล็อกอิน');
            } else {
                alert(data.message);
            }
        })
        .catch(error => console.error('Error registering:', error));
}

function login() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    if (!username || !password) {
        alert('กรุณาระบุ username และ password');
        return;
    }
    fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
        .then(response => response.json())
        .then(data => {
            if (data.token) {
                token = data.token;
                localStorage.setItem('token', token);
                localStorage.setItem('username', data.username);
                localStorage.setItem('userId', data.userId);
                document.getElementById('auth').style.display = 'none';
                document.getElementById('todo').style.display = 'block';
                document.getElementById('username').textContent = data.username;
                loadTasks();
            } else {
                alert(data.message);
            }
        })
        .catch(error => console.error('Error logging in:', error));
}

function logout() {
    localStorage.clear();
    token = null;
    document.getElementById('auth').style.display = 'block';
    document.getElementById('todo').style.display = 'none';
}

function loadTasks() {
    const category = document.getElementById('filterCategory').value;
    const completed = document.getElementById('filterStatus').value;
    let url = 'http://localhost:3000/tasks';
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (completed) params.append('completed', completed);
    if (params.toString()) url += `?${params.toString()}`;
    fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(tasks => {
            const ul = document.getElementById('taskList');
            ul.innerHTML = '';
            tasks.forEach(task => {
                const li = document.createElement('li');
                const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('th-TH') : 'ไม่มีกำหนด';
                li.innerHTML = `<strong>${task.title}</strong><br>${task.description || ''}<br>กำหนดส่ง: ${dueDate}<br>หมวดหมู่: ${task.category || 'ไม่มี'}<br>สถานะ: ${task.completed ? 'เสร็จแล้ว' : 'ยังไม่เสร็จ'}`;
                if (!task.completed) {
                    const completeBtn = document.createElement('button');
                    completeBtn.textContent = 'เสร็จ';
                    completeBtn.className = 'complete';
                    completeBtn.onclick = () => markComplete(task._id);
                    li.appendChild(completeBtn);
                }
                const editBtn = document.createElement('button');
                editBtn.textContent = 'แก้ไข';
                editBtn.className = 'edit';
                editBtn.onclick = () => editTask(task._id, task.title, task.description, task.dueDate, task.category);
                li.appendChild(editBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'ลบ';
                deleteBtn.className = 'delete';
                deleteBtn.onclick = () => deleteTask(task._id);
                li.appendChild(deleteBtn);

                ul.appendChild(li);
            });
        })
        .catch(error => console.error('Error loading tasks:', error));
}

function createTask() {
    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDescription').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const category = document.getElementById('taskCategory').value;
    if (!title) {
        alert('กรุณาระบุ title');
        return;
    }
    fetch('http://localhost:3000/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, description, dueDate, category })
    })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(() => {
            document.getElementById('taskTitle').value = '';
            document.getElementById('taskDescription').value = '';
            document.getElementById('taskDueDate').value = '';
            document.getElementById('taskCategory').value = '';
            loadTasks();
            Toastify({
                text: 'เพิ่มงานสำเร็จ!',
                duration: 3000,
                gravity: 'top',
                position: 'right',
                backgroundColor: '#28a745',
            }).showToast();
        })
        .catch(error => {
            console.error('Error creating task:', error);
            alert('เกิดข้อผิดพลาดในการเพิ่มงาน');
        });
}

function editTask(id, title, description, dueDate, category) {
    currentEditId = id;
    document.getElementById('editTitle').value = title;
    document.getElementById('editDescription').value = description || '';
    document.getElementById('editDueDate').value = dueDate ? new Date(dueDate).toISOString().split('T')[0] : '';
    document.getElementById('editCategoty').value = category || '';
    document.getElementById('editModal').style.display = 'block';
}

function saveEdit() {
    const title = document.getElementById('editTitle').value;
    const description = document.getElementById('editDescription').value;
    const dueDate = document.getElementById('editDueDate').value;
    const category = document.getElementById('editCategory').value;

    if (!title) {
        alert('กรุณาระบุ title');
        return
    }
    fetch(`http://localhost:3000/tasks/${currentEditId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, description, dueDate, category })
    })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(() => {
            document.getElementById('editModal').style.display = 'none';
            loadTasks();
            Toastify({
                text: 'แก้ไขงานสำเร็จ!',
                duration: 3000,
                gravity: 'top',
                position: 'right',
                backgroundColor: '#28a745',
            }).showToast();
        })
        .catch(error => {
            console.error('Error editing task:', error);
            alert('เกิดข้อผิดพลาดในการแก้ไขงาน');
        });
}

function cancelEdit() {
    document.getElementById('editModal').style.display = 'none';
}

function markComplete(id) {
    fetch(`http://localhost:3000/tasks/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ completed: true })
    })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(() => {
            loadTasks();
            Toastify({
                text: 'งานเสร็จแล้ว!',
                duration: 3000,
                gravity: 'top',
                position: 'right',
                backgroundColor: '#28a745',
            }).showToast();
        }).catch(error => {
            console.error('Error marking task complete:', error);
            alert('เกิดข้อผิดพลาดในการทำเครื่องหมายงาน');
        });
}
function deleteTask(id) {
    if (confirm('แน่ใจว่าต้องการลบงานนี้?')) {
        fetch(`http://localhost:3000/tasks/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(() => {
                loadTasks();
                Toastify({
                    text: 'ลบงานสำเร็จ!',
                    duration: 3000,
                    gravity: 'top',
                    position: 'right',
                    backgroundColor: '#28a745',
                }).showToast();
            })
            .catch(error => {
                console.error('Error deleting task:', error);
                alert('เกิดข้อผิดพลาดในการลบงาน');
            });
    }
}
document.querySelector('.close').onclick = cancelEdit;
window.onclick = (event) => {
    if (event.target === document.getElementById('editModal')) {
        document.getElementById('editModal').style.display = 'none';
    }
};
