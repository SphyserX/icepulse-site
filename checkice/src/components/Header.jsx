import React from "react";
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-around">
      <Link to="/map" className="hover:underline">Carte</Link>
      <Link to="/profile" className="hover:underline">Profil</Link>
      <Link to="/deplacement" className="hover:underline">Déplacements</Link>
    </nav>
  );
}
