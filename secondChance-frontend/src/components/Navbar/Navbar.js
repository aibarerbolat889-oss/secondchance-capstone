import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
export default function Navbar() {
  const { isLoggedIn, setIsLoggedIn, userName, setUserName } = useAppContext();
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  function logout() {
    ['auth-token', 'name', 'email'].forEach(key => sessionStorage.removeItem(key));
    setIsLoggedIn(false);
    setUserName('');
    navigate('/app');
  }
  return <nav className="navbar navbar-expand-lg navbar-light bg-light px-4 py-3">
    <Link className="navbar-brand" to="/app">SecondChance</Link>
    <button className="navbar-toggler" type="button" aria-label="Toggle navigation"
      aria-expanded={expanded} aria-controls="secondchance-navigation" onClick={() => setExpanded(!expanded)}>
      <span className="navbar-toggler-icon" />
    </button>
    <div id="secondchance-navigation" className={'navbar-collapse justify-content-end ' + (expanded ? '' : 'collapse')}>
      <ul className="navbar-nav gap-2">
        <li className="nav-item"><a className="nav-link" href="/">Home</a></li>
        <li className="nav-item"><Link className="nav-link" to="/app">Items</Link></li>
        <li className="nav-item"><Link className="nav-link" to="/app/search">Search</Link></li>
        {isLoggedIn ? <>
          <li className="nav-item"><Link className="nav-link" to="/app/profile">Welcome, {userName}</Link></li>
          <li className="nav-item"><button className="nav-link" onClick={logout}>Logout</button></li>
        </> : <>
          <li className="nav-item"><Link className="nav-link" to="/app/login">Login</Link></li>
          <li className="nav-item"><Link className="nav-link" to="/app/register">Register</Link></li>
        </>}
      </ul>
    </div>
  </nav>;
}
