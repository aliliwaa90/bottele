import { jsx as _jsx } from "react/jsx-runtime";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none", {
    variants: {
        variant: {
            default: "bg-primary text-primary-foreground",
            secondary: "bg-secondary text-secondary-foreground",
            outline: "border border-border text-foreground"
        }
    },
    defaultVariants: {
        variant: "default"
    }
});
export function Badge({ className, variant, ...props }) {
    return _jsx("div", { className: cn(badgeVariants({ variant }), className), ...props });
}
