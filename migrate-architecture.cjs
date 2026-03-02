const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');

console.log("Starting Migration...");

const dirStructure = [
    'core',
    'components/layout',
    'components/shared',
    'features/auth',
    'features/dashboard',
    'features/expenses',
    'features/loans',
    'features/groups',
    'features/business',
    'features/invoices',
    'features/settings',
    'features/trash'
];

dirStructure.forEach(dir => {
    const fullPath = path.join(SRC_DIR, dir.replace(/\//g, path.sep));
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

const coreFoldersToMove = ['contexts', 'hooks', 'lib', 'integrations'];
coreFoldersToMove.forEach(folder => {
    const src = path.join(SRC_DIR, folder);
    const dest = path.join(SRC_DIR, 'core', folder);
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
        try {
            // Use cpSync instead of renameSync to avoid Windows EPERM folder lock
            fs.cpSync(src, dest, { recursive: true });
            fs.rmSync(src, { recursive: true, force: true });
        } catch (e) {
            console.warn(`Could not completely remove old folder ${src} due to locks, but copied successfully.`);
        }
    }
});

const filesToMove = {
    // layout
    'components/AppSidebar.tsx': 'components/layout/AppSidebar.tsx',
    'components/AppLayout.tsx': 'components/layout/AppLayout.tsx',
    'components/QuickActionMenu.tsx': 'components/layout/QuickActionMenu.tsx',
    'components/PullToRefresh.tsx': 'components/layout/PullToRefresh.tsx',

    // shared
    'components/ThemeToggle.tsx': 'components/shared/ThemeToggle.tsx',
    'components/ErrorBoundary.tsx': 'components/shared/ErrorBoundary.tsx',
    'components/calculator.tsx': 'components/shared/calculator.tsx',

    // auth
    'pages/Auth.tsx': 'features/auth/Auth.tsx',

    // dashboard
    'components/Dashboard.tsx': 'features/dashboard/Dashboard.tsx',
    'components/DashboardComponents.tsx': 'features/dashboard/DashboardComponents.tsx',
    'components/AiInsights.tsx': 'features/dashboard/AiInsights.tsx',

    // expenses
    'pages/AllExpenses.tsx': 'features/expenses/AllExpenses.tsx',
    'components/ExpenseList.tsx': 'features/expenses/ExpenseList.tsx',
    'components/ExpenseChart.tsx': 'features/expenses/ExpenseChart.tsx',
    'components/AddExpenseDialog.tsx': 'features/expenses/AddExpenseDialog.tsx',
    'components/EditExpenseDialog.tsx': 'features/expenses/EditExpenseDialog.tsx',
    'components/SmartExpenseInput.tsx': 'features/expenses/SmartExpenseInput.tsx',
    'components/BillUpload.tsx': 'features/expenses/BillUpload.tsx',

    // loans
    'pages/BorrowedMoney.tsx': 'features/loans/BorrowedMoney.tsx',
    'components/BorrowedMoneySection.tsx': 'features/loans/BorrowedMoneySection.tsx',
    'components/BorrowedMoneyDialog.tsx': 'features/loans/BorrowedMoneyDialog.tsx',
    'components/BorrowedMoneyParties.tsx': 'features/loans/BorrowedMoneyParties.tsx',
    'pages/LentMoney.tsx': 'features/loans/LentMoney.tsx',
    'components/LentMoneySection.tsx': 'features/loans/LentMoneySection.tsx',
    'components/LentMoneyDialog.tsx': 'features/loans/LentMoneyDialog.tsx',
    'components/LentMoneyParties.tsx': 'features/loans/LentMoneyParties.tsx',
    'components/EditLentMoneyDialog.tsx': 'features/loans/EditLentMoneyDialog.tsx',

    // groups
    'pages/Groups.tsx': 'features/groups/Groups.tsx',
    'pages/GroupDetail.tsx': 'features/groups/GroupDetail.tsx',
    'pages/JoinGroup.tsx': 'features/groups/JoinGroup.tsx',
    'components/GroupExpenseDialog.tsx': 'features/groups/GroupExpenseDialog.tsx',

    // business
    'pages/BusinessDashboard.tsx': 'features/business/BusinessDashboard.tsx',
    'pages/Sales.tsx': 'features/business/Sales.tsx',
    'pages/Purchases.tsx': 'features/business/Purchases.tsx',
    'pages/Inventory.tsx': 'features/business/Inventory.tsx',
    'components/BusinessDetailsDialog.tsx': 'features/business/BusinessDetailsDialog.tsx',
    'components/RecordPurchaseDialog.tsx': 'features/business/RecordPurchaseDialog.tsx',
    'components/SalesInsightsDialog.tsx': 'features/business/SalesInsightsDialog.tsx',

    // invoices
    'components/CreateInvoiceDialog.tsx': 'features/invoices/CreateInvoiceDialog.tsx',

    // settings
    'pages/Settings.tsx': 'features/settings/Settings.tsx',
    'components/SettingsDialog.tsx': 'features/settings/SettingsDialog.tsx',
    'components/OnboardingDialog.tsx': 'features/settings/OnboardingDialog.tsx',
    'components/BudgetSection.tsx': 'features/settings/BudgetSection.tsx',

    // trash
    'pages/RecentlyDeletedPage.tsx': 'features/trash/RecentlyDeletedPage.tsx',
    'components/RecentlyDeleted.tsx': 'features/trash/RecentlyDeleted.tsx',
};

// Generate importMap from filesToMove automatically to prevent typos
const importMap = {};
for (const [srcFile, destFile] of Object.entries(filesToMove)) {
    const srcImport = '@/' + srcFile.replace('.tsx', '').replace('.ts', '').replace(/\\/g, '/');
    const destImport = '@/' + destFile.replace('.tsx', '').replace('.ts', '').replace(/\\/g, '/');
    importMap[srcImport] = destImport;
}

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

// 1. Gather all TS/TSX files
const tsxFiles = [];
walkDir(SRC_DIR, (filePath) => {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        tsxFiles.push(filePath);
    }
});

// 2. Perform replacements on original file content
tsxFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    const fileDir = path.dirname(file);
    const relativeToSrc = path.relative(SRC_DIR, fileDir).replace(/\\/g, '/');

    // Make all relative `./` imports absolute `@/` based
    content = content.replace(/from "\.\/([^"]+)"/g, (match, p1) => {
        const prefix = relativeToSrc ? `@/${relativeToSrc}` : `@`;
        return `from "${prefix}/${p1}"`;
    });

    content = content.replace(/from '\.\/([^']+)'/g, (match, p1) => {
        const prefix = relativeToSrc ? `@/${relativeToSrc}` : `@`;
        return `from '${prefix}/${p1}'`;
    });

    content = content.replace(/import\("\.\/([^"]+)"\)/g, (match, p1) => {
        const prefix = relativeToSrc ? `@/${relativeToSrc}` : `@`;
        return `import("${prefix}/${p1}")`;
    });

    // Apply the import map replacements
    for (const [oldImp, newImp] of Object.entries(importMap)) {
        // String literal boundaries
        const regex1 = new RegExp(`from "${oldImp}"`, 'g');
        content = content.replace(regex1, `from "${newImp}"`);

        const regex2 = new RegExp(`from '${oldImp}'`, 'g');
        content = content.replace(regex2, `from '${newImp}'`);

        const regex3 = new RegExp(`import\\("${oldImp}"\\)`, 'g');
        content = content.replace(regex3, `import("${newImp}")`);

        const regex4 = new RegExp(`import\\('${oldImp}'\\)`, 'g');
        content = content.replace(regex4, `import('${newImp}')`);
    }

    // Replace the bulk core folders mapping
    const coreFolders = ['contexts', 'hooks', 'lib', 'integrations'];
    coreFolders.forEach(folder => {
        const r1 = new RegExp(`from "@/${folder}/([^"]+)"`, 'g');
        content = content.replace(r1, `from "@/core/${folder}/$1"`);

        const r2 = new RegExp(`import\\("@/${folder}/([^"]+)"\\)`, 'g');
        content = content.replace(r2, `import("@/core/${folder}/$1")`);
    });

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
    }
});

// 3. Move the files to their new destinations
for (const [srcFile, destFile] of Object.entries(filesToMove)) {
    const srcPath = path.join(SRC_DIR, srcFile.replace(/\//g, path.sep));
    const destPath = path.join(SRC_DIR, destFile.replace(/\//g, path.sep));

    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
        try {
            fs.renameSync(srcPath, destPath);
        } catch (e) {
            fs.cpSync(srcPath, destPath);
            fs.rmSync(srcPath, { force: true });
        }
    }
}

console.log("Migration script executed successfully!");
