import React, { useState } from "react";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        alert("Connecté !");
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Compte créé !");
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-2xl font-bold mb-4">{isLogin ? "Connexion" : "Inscription"}</h2>
      <form className="flex flex-col gap-2 w-80" onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" className="p-2 border rounded" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input type="password" placeholder="Mot de passe" className="p-2 border rounded" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button type="submit" className="p-2 bg-blue-500 text-white rounded">{isLogin ? "Connexion" : "Inscription"}</button>
      </form>
      <button className="mt-2 text-blue-700 underline" onClick={()=>setIsLogin(!isLogin)}>
        {isLogin ? "Créer un compte" : "Se connecter"}
      </button>
    </div>
  );
}

export default Auth;
