import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const paths = [
  'src/screens/driver/CollectPaymentScreen.tsx',
  'src/screens/auth/RegisterScreen.tsx',
  'src/screens/admin/TripDetailsScreen.tsx',
  'src/components/driver/AmountInputModal.tsx',
  'src/screens/admin/VehicleManagementScreen.tsx',
  'src/screens/admin/AllBookingsScreen.tsx',
  'src/screens/admin/ReportsScreen.tsx',
  'src/screens/auth/LoginScreen.tsx',
  'src/screens/auth/RoleEntryScreen.tsx',
  'src/screens/admin/AddBankAccountScreen.tsx',
  'src/screens/admin/ExpenseScreen.tsx',
  'src/components/admin/AddDriverModal.tsx',
  'src/screens/admin/DriverManagementScreen.tsx',
  'src/components/admin/EditProfileForm.tsx',
  'src/components/admin/DriverModal.tsx',
  'src/components/admin/BookingDetailsModal.tsx',
];

const themeImp =
  "import { AppPalette } from '../../theme/palettes';\nimport { useTheme } from '../../theme/ThemeProvider';\n";

for (const rel of paths) {
  const f = path.join(root, rel);
  let s = fs.readFileSync(f, 'utf8');
  if (!s.includes('UI_CONFIG.colors')) {
    console.log('skip no colors', rel);
    continue;
  }

  s = s.replace(/^import React, \{([^}]*)\} from 'react';/m, (_m, inner) => {
    const parts = inner
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    if (!parts.includes('useMemo')) parts.push('useMemo');
    return `import React, { ${parts.join(', ')} } from 'react';`;
  });

  const cfgImp = `import { UI_CONFIG } from '../../constants/config';`;
  if (!s.includes(themeImp.trim())) {
    if (s.includes(cfgImp)) {
      s = s.replace(cfgImp + '\n', cfgImp + '\n' + themeImp);
    } else {
      const ni = s.indexOf('\n', s.search(/^import /m));
      s = s.slice(0, ni + 1) + themeImp + s.slice(ni + 1);
    }
  }

  if (!s.includes('{ colors } = useTheme()')) {
    s = s.replace(
      /(const [A-Za-z0-9_]+: React\.FC(?:<[\s\S]*?>)?\s*=\s*(?:\([^)]*\)|)\s*=>\s*\{\n)/,
      (m) =>
        `${m}  const { colors } = useTheme();\n  const styles = useMemo(() => createStyles(colors), [colors]);\n`
    );
  }

  s = s.replace(/\bUI_CONFIG\.colors\b/g, 'colors');

  if (!s.includes('function createStyles')) {
    s = s.replace(/\nconst styles = StyleSheet\.create\(\{/g, '\nfunction createStyles(colors: AppPalette) {\n  return StyleSheet.create({');
    s = s.replace(/\}\);(\s*)\nexport default /m, '});\n}\n$1\nexport default ');
  }

  fs.writeFileSync(f, s, 'utf8');
  console.log('ok', rel);
}
