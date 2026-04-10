import { useState, useEffect } from "react";

export function useRandomUsername() {
  const [placeholder, setPlaceholder] = useState("Enter a nickname");

  useEffect(() => {
    console.log("HERE");
    fetch("/usernames.txt")
      .then((res) => res.text())
      .then((text) => {
        const names = text.split("\n").filter((name) => name.trim() !== "");
        if (names.length > 0) {
          const randomName = names[Math.floor(Math.random() * names.length)];
          setPlaceholder(randomName);
        }
      })
      .catch(() => {});
  }, []);

  return placeholder;
}

