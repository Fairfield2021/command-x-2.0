import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Briefcase,
  UserCheck,
  Building2,
  Users,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const createItems = [
  { label: "New Job", icon: Briefcase, path: "/jobs?new=true" },
  { label: "New Customer", icon: UserCheck, path: "/customers?new=true" },
  { label: "New Vendor", icon: Building2, path: "/vendors?new=true" },
  { label: "New Personnel", icon: Users, path: "/personnel?new=true" },
];

export function GlobalCreateMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleAction = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <SidebarMenuButton
              tooltip="Quick Create"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              <span>Create</span>
            </SidebarMenuButton>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="end"
            className="w-48 p-1"
          >
            {createItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleAction(item.path)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
