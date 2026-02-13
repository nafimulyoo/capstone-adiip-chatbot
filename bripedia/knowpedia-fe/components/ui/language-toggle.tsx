"use client";
import { Button } from "./button";
import { useLanguage } from "@/contexts/language-context";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "id" ? "en" : "id");
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleLanguage}
      className="rounded-full h-10 w-10 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 bg-transparent hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-primary-foreground hover:shadow-md hover:shadow-primary/30 border border-primary/30"
    >
      <span className="text-xs font-semibold">
        {language === "id" ? "ID" : "EN"}
      </span>
      <span className="sr-only">Toggle language</span>
    </Button>
  );
}
