import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

export type DropdownOption = { id: string; label: string };

// Collapsed field with a chevron; opens the option list on touch, closes on choice.
export function Dropdown({ value, options, onChange, placeholder }: { value: string; options: DropdownOption[]; onChange: (id: string) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value);
  return (
    <View>
      <Pressable accessibilityRole="button" onPress={() => setOpen((x) => !x)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#c9bfb4", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 12, backgroundColor: "#fff" }}>
        <Text style={{ flex: 1, color: current ? "#1c1c1c" : "#6b5d52" }}>{current ? current.label : placeholder}</Text>
        <Text style={{ color: "#6b5d52" }}>{open ? "⌃" : "⌄"}</Text>
      </Pressable>
      {open && (
        <View style={{ borderWidth: 1, borderColor: "#c9bfb4", borderTopWidth: 0, borderRadius: 6, backgroundColor: "#fff" }}>
          {options.map((o) => (
            <Pressable key={o.id} onPress={() => { onChange(o.id); setOpen(false); }} style={{ paddingHorizontal: 10, paddingVertical: 12, borderTopWidth: 1, borderColor: "#eee" }}>
              <Text style={{ fontWeight: o.id === value ? "700" : "400", color: "#1c1c1c" }}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
