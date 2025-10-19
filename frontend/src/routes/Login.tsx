import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { login } from "../lib/auth";
import { toast } from "react-hot-toast";

export default function Login() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Enter valid credentials");
      return;
    }

    try {
      // call auth client which expects an object
      const data = await login({ email, password });

      if (data?.token) {
        // your app's setter (replace with your context/setter if different)
        toast.success("Login successful");

        const bc = new BroadcastChannel("auth");
        bc.postMessage({ type: "login" });
        bc.close();

        navigate("/dashboard");
      } else {
        toast.error("Invalid credentials");
      }
    } catch (err) {
      console.error(err);
      toast.error("Login failed");
    }
  }

  return (
    <div className="flex items-center justify-center h-[80vh] w-full">
      <Card className="w-full max-w-md border border-gray-200 dark:border-gray-700 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
            Login
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
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
                placeholder="Enter your password"
              />
            </div>

            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>

          <p className="text-sm text-center text-gray-600 dark:text-gray-300 mt-4">
            Don’t have an account?{" "}
            <Link
              to="/register"
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
