Add-Type -AssemblyName System.Drawing

$files = @("grass.png", "grass with tree.png", "envelope.png", "blank sheet.png", "cassette player.png", "tape.png", "player.png")

foreach ($file in $files) {
    if (Test-Path $file) {
        try {
            $imgPath = (Resolve-Path $file).Path
            $img = [System.Drawing.Bitmap]::FromFile($imgPath)
            
            [int]$w = $img.Width
            [int]$h = $img.Height
            
            $newImg = New-Object System.Drawing.Bitmap($w, $h)
            $g = [System.Drawing.Graphics]::FromImage($newImg)
            $g.DrawImage($img, 0, 0, $w, $h)
            $newImg.MakeTransparent([System.Drawing.Color]::White)
            
            if ($file -eq "player.png") {
                [int]$cols = 4
                [int]$rows = 1
                if ($w -eq $h) { $cols = 2; $rows = 2 }
                elseif ($h -gt $w) { $cols = 1; $rows = 4 }
                
                [int]$fw = $w / $cols
                [int]$fh = $h / $rows
                
                if ($fw -gt 0 -and $fh -gt 0) {
                    $names = @("player_idle.png", "player_walk1.png", "player_walk2.png", "player_jump.png")
                    [int]$idx = 0
                    for ([int]$r = 0; $r -lt $rows; $r++) {
                        for ([int]$c = 0; $c -lt $cols; $c++) {
                            if ($idx -lt 4) {
                                $frame = New-Object System.Drawing.Bitmap($fw, $fh)
                                $fg = [System.Drawing.Graphics]::FromImage($frame)
                                $rect = New-Object System.Drawing.Rectangle(($c * $fw), ($r * $fh), $fw, $fh)
                                $fg.DrawImage($newImg, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
                                
                                $framePath = (Resolve-Path ".").Path + "\" + $names[$idx]
                                $frame.Save($framePath, [System.Drawing.Imaging.ImageFormat]::Png)
                                $fg.Dispose()
                                $frame.Dispose()
                                $idx++
                            }
                        }
                    }
                }
            }
            
            $tempPath = $imgPath + ".tmp.png"
            $newImg.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
            
            $img.Dispose()
            $g.Dispose()
            $newImg.Dispose()
            
            Move-Item -Path $tempPath -Destination $imgPath -Force
            Write-Host "Processed $file successfully."
        } catch {
            Write-Host "Failed to process $file : $_"
        }
    }
}
