const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const features = {
    business: {
        pages: ['BusinessDashboard.tsx', 'Sales.tsx', 'Purchases.tsx', 'Parties.tsx', 'PrintStudio.tsx', 'Inventory.tsx', 'Reports.tsx'],
        components: ['BusinessDetailsDialog.tsx', 'DetailedPartyReport.tsx', 'GSTR1Report.tsx', 'PartyReport.tsx', 'RecordPurchaseDialog.tsx', 'RevenueAnalytics.tsx', 'SalesInsightsDialog.tsx']
    },
    expenses: {
        pages: ['AllExpenses.tsx'],
        components: ['AddExpenseDialog.tsx', 'BillUpload.tsx', 'EditExpenseDialog.tsx', 'ExpenseChart.tsx', 'ExpenseList.tsx', 'MonthlyExpenseReport.tsx', 'SmartExpenseInput.tsx']
    },
    loans: {
        pages: ['LentMoney.tsx', 'BorrowedMoney.tsx'],
        components: ['BorrowedMoneyDialog.tsx', 'BorrowedMoneyParties.tsx', 'BorrowedMoneySection.tsx', 'EditLentMoneyDialog.tsx', 'LentMoneyDialog.tsx', 'LentMoneyParties.tsx', 'LentMoneySection.tsx']
    },
    trash: {
        pages: ['RecentlyDeletedPage.tsx'],
        components: ['RecentlyDeleted.tsx']
    },
    reports: {
        pages: ['PersonalReports.tsx'],
        components: []
    },
    settings: {
        pages: ['Settings.tsx'],
        components: ['BudgetSection.tsx', 'OnboardingDialog.tsx', 'SettingsDialog.tsx']
    }
};

const mappings = []; // { oldPath: string, newPath: string, feature: string, type: string, file: string }

for (const [featureName, config] of Object.entries(features)) {
    const featureDir = path.join(srcDir, 'features', featureName);
    
    // Create directories
    const pagesDir = path.join(featureDir, 'pages');
    const componentsDir = path.join(featureDir, 'components');
    
    if (!fs.existsSync(pagesDir)) fs.mkdirSync(pagesDir, { recursive: true });
    if (!fs.existsSync(componentsDir)) fs.mkdirSync(componentsDir, { recursive: true });

    config.pages.forEach(file => {
        const oldFile = path.join(featureDir, file);
        if (fs.existsSync(oldFile)) {
            const newFile = path.join(pagesDir, file);
            fs.renameSync(oldFile, newFile);
            mappings.push({ feature: featureName, type: 'pages', file: file.replace('.tsx', ''), isTsx: file.endsWith('.tsx') });
        }
    });

    config.components.forEach(file => {
        const oldFile = path.join(featureDir, file);
        if (fs.existsSync(oldFile)) {
            const newFile = path.join(componentsDir, file);
            fs.renameSync(oldFile, newFile);
            mappings.push({ feature: featureName, type: 'components', file: file.replace('.tsx', ''), isTsx: file.endsWith('.tsx') });
        }
    });
}

// Now recursively find all .ts and .tsx files and replace imports
function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllFiles(filePath, fileList);
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const allFiles = getAllFiles(srcDir);

console.log(`Updating imports in ${allFiles.length} files...`);

let updatedCount = 0;

for (const file of allFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    for (const mapping of mappings) {
        // We look for imports like: '@/features/business/BusinessDashboard' or '@/features/business/BusinessDashboard.tsx'
        const regex1 = new RegExp(`@/features/${mapping.feature}/${mapping.file}(?!/)`, 'g');
        const replacement1 = `@/features/${mapping.feature}/${mapping.type}/${mapping.file}`;
        content = content.replace(regex1, replacement1);

        // also relative imports if any
        // wait, handling relative imports is tricky. 
        // e.g., in a file inside src/features/business/pages/ we might import a component.
        // For safe SaaS refactor, any relative import outside its own folder might break.
        // But before the move, they were likely `./BusinessDetailsDialog` inside `BusinessDashboard.tsx`.
        // Now `BusinessDashboard.tsx` is in `pages/`, and `BusinessDetailsDialog` is in `components/`.
        // The old import `./BusinessDetailsDialog` needs to become `../components/BusinessDetailsDialog`.
        // To be completely safe and modern, we will replace all relative intra-feature imports to absolute `@/features/...` imports.
        
        // This is a complex regex. Let's just fix the known broken relative imports specifically.
        // Actually, replacing `./FileName` with `@/features/...` inside the SAME feature is safest.
    }

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        updatedCount++;
    }
}

console.log(`Updated ${updatedCount} files with absolute alias imports.`);

// One pass to fix relative intra-feature imports that we broke by moving files
// A file that was in /features/business/ and moved to /features/business/pages/
// might have imports like `import X from "./BusinessDetailsDialog"`.
// We should replace `./BusinessDetailsDialog` with `@/features/business/components/BusinessDetailsDialog`
for (const file of allFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    
    // Check if the current file is one of the moved files
    const fileFeatureObj = mappings.find(m => file.includes(path.join('features', m.feature, m.type, m.file)));
    if (fileFeatureObj) {
        // Look for `./[ComponentName]` and `../[ComponentName]` and fix them.
        for (const mapping of mappings) {
            if (mapping.feature === fileFeatureObj.feature) {
                 const relativeMatch1 = new RegExp(`['"]\\./${mapping.file}['"]`, 'g');
                 const relativeMatch2 = new RegExp(`['"]\\.\\./${mapping.file}['"]`, 'g');
                 const replacement = `"@/features/${mapping.feature}/${mapping.type}/${mapping.file}"`;
                 
                 content = content.replace(relativeMatch1, replacement);
                 content = content.replace(relativeMatch2, replacement);
            }
        }
    }

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
    }
}

// Special case: App.tsx routes.
// The first loop replaced `@/features/business/BusinessDashboard` with `@/features/business/pages/BusinessDashboard`
// which is exactly what we want.

console.log("Refactoring complete.");
