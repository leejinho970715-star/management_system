from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

root=Path(__file__).resolve().parents[1]
out=root/'tmp/pdfs/fonts';out.mkdir(parents=True,exist_ok=True)
font=TTFont(root/'app/fonts/PretendardVariable.woff2')
for name,weight in [('Regular',400),('Bold',700)]:
    instance=instantiateVariableFont(font,{'wght':weight},inplace=False)
    instance.flavor=None
    instance.save(out/('Pretendard-'+name+'.ttf'))
print('Pretendard fonts for PDF prepared')
