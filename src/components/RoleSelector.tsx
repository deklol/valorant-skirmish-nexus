import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const valorantRoles = [
  'Duelist',
  'Controller', 
  'Initiator',
  'Sentinel'
];

interface RoleSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export const RoleSelector = ({ value, onValueChange, placeholder = "Select a role" }: RoleSelectorProps) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {valorantRoles.map((role) => (
          <SelectItem key={role} value={role}>
            {role}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};