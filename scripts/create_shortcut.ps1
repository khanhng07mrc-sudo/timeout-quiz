$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut('D:\Timeout Quiz\Timeout-Quiz-Studio3D.lnk')
$s.TargetPath = 'D:\Timeout Quiz\timeout-quiz\dist-app\Timeout-Quiz-Studio3D-win32-x64\Timeout-Quiz-Studio3D.exe'
$s.WorkingDirectory = 'D:\Timeout Quiz\timeout-quiz\dist-app\Timeout-Quiz-Studio3D-win32-x64'
$s.Description = 'Timeout Quiz VTV3 Studio 3D Desktop Application'
$s.Save()
Write-Host "Shortcut created successfully."
