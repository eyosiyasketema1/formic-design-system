import * as React from "react";
import { ChevronRight } from "lucide-react";

type CardProps = React.HTMLAttributes<HTMLDivElement> & { title?: string; href?: string };

export function Card({ title, href, className = "", children, ...props }: CardProps) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-6 shadow-lg ${className}`} {...props}>
      {title ? (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {href ? (
            <a href={href} className="flex items-center text-sm text-blue-600 hover:text-blue-800">
              View <ChevronRight className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function CardFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-500">{children}</div>;
}
