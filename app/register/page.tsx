"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const registerSchema = z
	.object({
		username: z.string().min(3, "Username must be at least 3 characters").max(50),
		password: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string().min(1, "Confirm your password"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

type RegisterValues = z.infer<typeof registerSchema>;

function RegisterPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(false);

	const invitationData = useMemo(() => {
		const id = searchParams.get("id") ?? "";
		const email = searchParams.get("email") ?? "";
		const invitationHash = searchParams.get("invitationHash") ?? "";

		return { id, email, invitationHash };
	}, [searchParams]);

	const hasRequiredParams =
		invitationData.id.length > 0 &&
		invitationData.email.length > 0 &&
		invitationData.invitationHash.length > 0;

	const form = useForm<RegisterValues>({
		resolver: zodResolver(registerSchema),
		defaultValues: {
			username: "",
			password: "",
			confirmPassword: "",
		},
	});

	async function onSubmit(values: RegisterValues) {
		if (!hasRequiredParams) {
			toast.error("Invalid invitation link");
			return;
		}

		setLoading(true);

		try {
			const response = await fetch("/api/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id: Number(invitationData.id),
					email: invitationData.email,
					invitationHash: invitationData.invitationHash,
					username: values.username,
					password: values.password,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				toast.error(data.error || "Failed to register");
				return;
			}

			toast.success("Account registered successfully");
			router.push("/login");
		} catch (error) {
			console.error("Register error:", error);
			toast.error("Failed to register");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex min-h-[80vh] items-center justify-center">
			<Card className="w-full max-w-md">
				<CardHeader className="space-y-1">
					<div className="mb-4 flex items-center justify-center">
						<div className="rounded-full bg-primary/10 p-3">
							<UserPlus className="h-6 w-6 text-primary" />
						</div>
					</div>
					<CardTitle className="text-center text-2xl">Register</CardTitle>
					<CardDescription className="text-center">
						Set your username and password to activate your access.
					</CardDescription>
				</CardHeader>

				<CardContent>
					{!hasRequiredParams ? (
						<p className="text-sm text-destructive">Invalid invitation link.</p>
					) : (
						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
								<FormField
									control={form.control}
									name="username"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Username</FormLabel>
											<FormControl>
												<Input placeholder="Enter your username" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="password"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Password</FormLabel>
											<FormControl>
												<Input type="password" placeholder="Enter your password" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="confirmPassword"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Confirm Password</FormLabel>
											<FormControl>
												<Input type="password" placeholder="Confirm your password" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<Button type="submit" className="w-full" disabled={loading}>
									{loading ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Registering...
										</>
									) : (
										"Register"
									)}
								</Button>
							</form>
						</Form>
					)}
				</CardContent>

				<CardFooter>
					<p className="mt-2 w-full text-center text-xs text-muted-foreground">
						Inventory Management System - MCC BC
					</p>
				</CardFooter>
			</Card>
		</div>
	);
}

export default function RegisterPage() {
	return (
		<Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center" />}>
			<RegisterPageContent />
		</Suspense>
	);
}
