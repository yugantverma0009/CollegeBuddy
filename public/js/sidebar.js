// injects the sidebar into any page that has #sidebar-container
function renderSidebar() {
  const container = document.getElementById('sidebar-container');
  if (!container) return;

  container.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <h2>College Buddy</h2>
        <span>Campus companion</span>
      </div>

      <div class="sidebar-user">
        <div class="avatar" id="sidebar-avatar">?</div>
        <div class="uinfo">
          <h4 id="sidebar-name">Loading...</h4>
          <span id="sidebar-role"></span>
        </div>
      </div>

      <nav>
        <div class="nav-section">Main</div>
        <a href="/dashboard.html" data-hide-role="teacher"><span class="icon"></span>Dashboard</a>
        <a href="/notes.html" data-hide-role="teacher"><span class="icon"></span>Study Notes</a>
        <a href="/mess.html" data-hide-role="teacher"><span class="icon"></span>Mess Menu</a>
        <a href="/lostfound.html" data-hide-role="teacher"><span class="icon"></span>Lost &amp; Found</a>
        <a href="/attendance.html" data-hide-role="teacher"><span class="icon"></span>Attendance</a>
        <a href="/timetable.html"><span class="icon"></span>Timetable</a>
        <a href="/students.html" data-role="non-student" data-hide-role="teacher"><span class="icon"></span>Student Directory</a>
        <a href="/dining.html" data-hide-role="teacher"><span class="icon"></span>Dining Places</a>
        <a href="/polls.html"><span class="icon"></span>Polls</a>

        <div class="nav-section" data-role="admin">Admin</div>
        <a href="/admin.html" data-role="admin"><span class="icon"></span>Admin Panel</a>
      </nav>

      <div class="sidebar-bottom">
        <button class="theme-switch-btn" id="theme-toggle" data-theme-toggle="1">Dark Mode</button>
        <button class="logout-btn" id="logout-btn">Logout</button>
      </div>
    </aside>
  `;

  initSidebar();
}
