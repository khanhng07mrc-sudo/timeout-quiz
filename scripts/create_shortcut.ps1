$ws = New-Object -ComObject WScript.Shell

# Remove old shortcut if present
$oldShortcut = 'D:\Timeout Quiz\Timeout-Quiz-Studio3D.lnk'
if (Test-Path $oldShortcut) {
    Remove-Item $oldShortcut -Force
    Write-Host "Removed legacy shortcut: $oldShortcut"
}

# Create Quizorra shortcut
$s = $ws.CreateShortcut('D:\Timeout Quiz\Quizorra.lnk')
$s.TargetPath = 'D:\Timeout Quiz\timeout-quiz\dist-app\Quizorra-win32-x64\Quizorra.exe'
$s.WorkingDirectory = 'D:\Timeout Quiz\timeout-quiz\dist-app\Quizorra-win32-x64'
$s.Description = 'Quizorra VTV3 Studio 3D Desktop Application'
$s.Save()
Write-Host "Quizorra shortcut created successfully at D:\Timeout Quiz\Quizorra.lnk"
