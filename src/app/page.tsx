import { redirect } from "next/navigation";
import { STAGES } from "@/lib/constants";

export default function Home() {
  redirect(`/${STAGES[0]}`);
}
