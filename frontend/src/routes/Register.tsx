import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { toast } from "react-hot-toast";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { register } from "../lib/auth";

export default function Register() {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const navigate = useNavigate();

async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  if (!name || !email || !password) {
    toast.error("Fill all fields");
    return;
  }

  try {
    // call client which expects an object
    const resp = await register({ full_name: name, email, password });

    // success when backend returns a token (access)
    if (resp?.token) {
      toast.success("Registration successful");
      navigate("/dashboard");
      return;
    }

    // backend returned structured response but no token
    const msg = resp?.message ?? "Registration failed";
    toast.error(msg);
  } catch (err: any) {
    console.error(err);
    // if error response from axios-like client include message/body
    if (err?.response?.data) {
      const body = err.response.data;
      // prefer explicit error fields if present
      const errMsg = body.error || body.message || JSON.stringify(body);
      toast.error(errMsg);
    } else {
      toast.error("Network or server error");
    }
  }
}



  return (
    <div className="flex items-center justify-center h-[70vh] w-full">
      <Card className="w-full max-w-md border border-gray-200 dark:border-gray-700 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
            Register
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setName(e.target.value)
                }
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                placeholder="Create a password"
              />
            </div>

            <Button type="submit" className="w-full">
              Register
            </Button>
          </form>

          <p className="text-sm text-center text-gray-600 dark:text-gray-300 mt-4">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
