Add-Type -AssemblyName System.Drawing

$files = @(
    "grass.png",
    "grass with tree.png",
    "envelope.png",
    "blank sheet.png",
    "cassette player.png",
    "tape.png",
    "player.png"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $imgPath = (Resolve-Path $file).Path
        $img = [System.Drawing.Bitmap]::FromFile($imgPath)
        
        $newImg = new-object System.Drawing.Bitmap($img.Width, $img.Height)
        $g = [System.Drawing.Graphics]::FromImage($newImg)
        $g.DrawImage($img, 0, 0)
        
        # Set transparent color
        $newImg.MakeTransparent([System.Drawing.Color]::White)
        
        $img.Dispose()
        $g.Dispose()
        
        # Save over
        $newImg.Save($imgPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        if ($file -eq "player.png") {
            $w = $newImg.Width
            $h = $newImg.Height
            Write-Output "Player dimensions: $w x $h"
            
            $cols = 4
            $rows = 1
            if ($w -eq $h) {
                $cols = 2
                $rows = 2
            } elseif ($h -gt $w) {
                $cols = 1
                $rows = 4
            }
            
            $fw = [math]::Floor($w / $cols)
            $fh = [math]::Floor($h / $rows)
            
            $idx = 0
            $names = @("player_idle.png", "player_walk1.png", "player_walk2.png", "player_jump.png")
            for ($r = 0; $r -lt $rows; $r++) {
                for ($c = 0; $c -lt $cols; $c++) {
                    if ($idx -lt 4) {
                        $frame = new-object System.Drawing.Bitmap($fw, $fh)
                        $fg = [System.Drawing.Graphics]::FromImage($frame)
                        $rect = new-object System.Drawing.Rectangle($c * $fw, $r * $fh, $fw, $fh)
                        $fg.DrawImage($newImg, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
                        
                        $frameName = (Resolve-Path .).Path + "\" + $names[$idx]
                        $frame.Save($frameName, [System.Drawing.Imaging.ImageFormat]::Png)
                        $fg.Dispose()
                        $frame.Dispose()
                        $idx++
                    }
                }
            }
        }
        
        $newImg.Dispose()
        Write-Output "Processed $file"
    } else {
        Write-Output "File not found: $file"
    }
}
