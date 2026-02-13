"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogIn, User as UserIcon, Shield, Briefcase, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const DUMMY_DEMO_USERS = [
    { name: "Doni Admin", email: "admin@knowpedia.com", pass: "admin123", level: "director", groups: "admin, IT, ESG" },
    { name: "Citra Director IT", email: "director_it@knowpedia.com", pass: "director123", level: "director", groups: "IT" },
    { name: "Bambang Director ESG", email: "director_esg@knowpedia.com", pass: "director123", level: "director", groups: "ESG" },
    { name: "Eko Manager IT", email: "manager_it@knowpedia.com", pass: "manager123", level: "manager", groups: "IT" },
    { name: "Budi Manager ESG", email: "manager_esg@knowpedia.com", pass: "manager123", level: "manager", groups: "ESG" },
    { name: "Fajar Staff IT", email: "staff_it@knowpedia.com", pass: "staff123", level: "staff", groups: "IT" },
    { name: "Ahmad Staff ESG", email: "staff_esg@knowpedia.com", pass: "staff123", level: "staff", groups: "ESG" },
];

export default function LoginPage() {
    const { login, isAuthenticated } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Redirect if already authenticated
    React.useEffect(() => {
        if (isAuthenticated) {
            router.push("/search");
        }
    }, [isAuthenticated, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsLoading(true);
        try {
            await login(email, password);
            toast.success("Login successful!");
            router.push("/search");
        } catch (error: any) {
            toast.error(error.message || "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    const fillCredentials = (userEmail: string, userPass: string) => {
        setEmail(userEmail);
        setPassword(userPass);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-muted/50 to-background">
            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left side: Hero & Landing info */}
                <div className="flex flex-col justify-center space-y-6 lg:p-8">
                    <div className="space-y-2">
                        <Badge variant="outline" className="px-3 py-1 border-primary/50 text-primary bg-primary/5 mb-2">
                            KnowPedia Regulation Base
                        </Badge>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary animate-gradient">
                            KnowPedia
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-[600px]">
                            Advanced Regulation Management System powered by AI. Securely manage, browse and query your organization's internal and external regulatory documents.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                        <div className="p-4 rounded-xl border bg-card/50 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all">
                            <Shield className="w-8 h-8 text-primary mb-2" />
                            <h3 className="font-semibold">Secure Access</h3>
                            <p className="text-sm text-muted-foreground">Granular level and group based permissions for all documents.</p>
                        </div>
                        <div className="p-4 rounded-xl border bg-card/50 backdrop-blur-sm border-accent/10 hover:border-accent/30 transition-all">
                            <Briefcase className="w-8 h-8 text-accent mb-2" />
                            <h3 className="font-semibold">Smart Inquiry</h3>
                            <p className="text-sm text-muted-foreground">AI-powered RAG system that respects your organizational hierarchy.</p>
                        </div>
                    </div>
                </div>

                {/* Right side: Login Form & Demo Table */}
                <div className="space-y-6">
                    <Card className="border-primary/20 shadow-xl shadow-primary/10 backdrop-blur-md bg-card/80">
                        <CardHeader>
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <LogIn className="w-5 h-5 text-primary" />
                                Sign In
                            </CardTitle>
                            <CardDescription>
                                Enter your credentials to access the regulation base
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleLogin}>
                            <CardContent className="space-y-4 mb-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="border-primary/20 focus-visible:ring-primary"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="border-primary/20 focus-visible:ring-primary"
                                    />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity font-semibold"
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                                    Login
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>

                    <Card className="border-muted-foreground/20 bg-muted/30">
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                Demo Users (Click to Fill)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[300px] overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="text-xs">User</TableHead>
                                            <TableHead className="text-xs">Level</TableHead>
                                            <TableHead className="text-xs">Groups</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {DUMMY_DEMO_USERS.map((user, idx) => (
                                            <TableRow
                                                key={idx}
                                                className="cursor-pointer hover:bg-primary/5 transition-colors"
                                                onClick={() => fillCredentials(user.email, user.pass)}
                                            >
                                                <TableCell className="text-xs font-medium py-2">
                                                    <div>{user.name}</div>
                                                    <div className="text-[10px] text-muted-foreground font-normal">{user.email}</div>
                                                </TableCell>
                                                <TableCell className="text-xs py-2">
                                                    <Badge variant="secondary" className="text-[10px] py-0">{user.level}</Badge>
                                                </TableCell>
                                                <TableCell className="text-xs py-2 text-muted-foreground">
                                                    {user.groups}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
