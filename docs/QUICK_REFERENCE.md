# ⚡ QUICK REFERENCE CARD

Referensi cepat untuk implementasi File Manager Modular

---

## 🎯 PRIORITY FITUR

### 🔴 Week 1: CRITICAL
1. **Log Modal** (3 hari) - Backup lines 2905-3194
2. **Recent Destinations** (2 hari) - Backup lines 2482-2537  
3. **Media Preview** (2 hari) - Backup lines 1404-1550

### 🟠 Week 2: HIGH
4. **Drag & Drop Fix** (2 hari) - Backup lines 2254-2410
5. **Move Search** (2 hari) - Backup lines 2856-2879
6. **Move Shortcuts** (1 hari) - Backup lines 2841-2855

### 🟡 Week 3: MEDIUM
7. **Line Numbers Sync** (2 hari) - Backup lines 1133-1268
8. **State Persistence** (2 hari) - New implementation

---

## 📂 FILE LOCATIONS

### Backup (Reference)
```
bak/Filemanagerbak/assets/js/index.js  (2989 lines)
```

### Current Files to Modify
```
NEW:  assets/js/modules/logModal.js
EDIT: assets/js/modules/moveOverlay.js
EDIT: assets/js/modules/modals.js
EDIT: assets/js/modules/dragDrop.js
EDIT: assets/js/modules/appInitializer.js
NEW:  assets/js/modules/storage.js (Week 3)
```

---

## 🔧 COMMON COMMANDS

### Git Workflow
```bash
# Start
git checkout -b feature/phase1-critical-features
git push origin feature/phase1-critical-features

# Daily commits
git add .
git commit -m "feat(scope): description"
git push

# End of phase
git checkout main
git merge feature/phase1-critical-features
```

### Testing
```bash
# Open browser
http://localhost/Filemanager

# Check console (F12)
# Should see: No errors

# Test feature
# Verify: Works as expected
```

---

## 📋 DAILY CHECKLIST

### Morning (9:00)
- [ ] Review PROGRESS_TRACKER.md
- [ ] Plan today's tasks
- [ ] Coffee ☕

### Development (10:00-17:00)
- [ ] Code implementation
- [ ] Test each function
- [ ] Fix bugs
- [ ] Commit frequently

### Evening (17:00)
- [ ] Final testing
- [ ] Push to Git
- [ ] Update PROGRESS_TRACKER.md
- [ ] Plan tomorrow

---

## 🐛 DEBUG SHORTCUTS

### Console Commands
```javascript
// Check state
console.log(state);

// Check specific state
console.log(state.move.recents);

// Check element exists
console.log(document.getElementById('element-id'));

// Reload modules (after changes)
location.reload();
```

### Common Fixes
```javascript
// Not updating UI?
// → Call update function after state change

// Module not found?
// → Check import path and export

// localStorage not working?
// → Check browser privacy settings

// Function not defined?
// → Check if imported properly
```

---

## 📞 QUICK LINKS

### Documentation
- [Getting Started](GETTING_STARTED.md) - Panduan lengkap mulai
- [Implementation Roadmap](IMPLEMENTATION_ROADMAP.md) - Timeline detail
- [Progress Tracker](PROGRESS_TRACKER.md) - Daily tracking
- [Executive Summary](EXECUTIVE_SUMMARY.md) - Overview project
- [Issues Report](COMPREHENSIVE_MODULAR_ISSUES_REPORT.md) - Analisis teknis

### Code Reference
- Backup: `bak/Filemanagerbak/assets/js/index.js`
- Current: `assets/js/modules/`
- Backend: `lib/file_manager.php`

---

## 🎯 SUCCESS METRICS

### Daily
- [ ] Code committed & pushed
- [ ] No console errors
- [ ] Features tested
- [ ] Progress tracker updated

### Weekly
- [ ] Phase milestone reached
- [ ] Demo successful
- [ ] Tests passing
- [ ] Team approval

### Final
- [ ] All 10 features complete
- [ ] 80%+ test coverage
- [ ] Performance targets met
- [ ] Production deployed

---

## ⚡ FIRST STEPS (NOW!)

```bash
# 1. Create branch
git checkout -b feature/phase1-critical-features

# 2. Open files
code assets/js/modules/moveOverlay.js
code bak/Filemanagerbak/assets/js/index.js

# 3. Start coding!
# Copy lines 2482-2537 from backup
# Adapt to modular structure
# Test & commit

# 4. Celebrate first win! 🎉
```

---

## 📊 PHASE PROGRESS

```
Week 1: ⬜⬜⬜⬜⬜ 0%  Start: 18 Nov
Week 2: ⬜⬜⬜⬜⬜ 0%  Start: 25 Nov  
Week 3: ⬜⬜⬜⬜⬜ 0%  Start: 2 Dec
Week 4: ⬜⬜⬜⬜⬜ 0%  Start: 9 Dec
──────────────────────────────────
Total:  ⬜⬜⬜⬜⬜ 0%  Done: 13 Dec
```

---

**Last Updated**: 15 Nov 2025  
**Next Milestone**: Phase 1 Demo - 22 Nov 2025

**LET'S GO!** 🚀