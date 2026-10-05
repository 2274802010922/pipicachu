"""Render native graphics and real-footage cuts; no fictional wallet popup or UI edits."""
import hashlib,json,math,re,subprocess,textwrap,wave
from pathlib import Path
import numpy as np,qrcode
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'work/video-demo-vi'
M=json.loads((OUT/'timed-storyboard.json').read_text(encoding='utf-8'));SRC=Path(M['source'])
BG='#F7F6F1';INK='#091426';BLUE='#2456E6';MUTED='#526174';LIME='#B7F34D';W,H=1920,1080
AUDIT=[]
def run(args,name):
    p=subprocess.run(args,cwd=OUT,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    (OUT/(name+'.log')).write_bytes(p.stderr)
    if p.returncode:raise RuntimeError(name+': '+p.stderr.decode('utf-8','replace')[-1500:])
def font(size,bold=False):return ImageFont.truetype('C:/Windows/Fonts/'+('segoeuib.ttf' if bold else 'segoeui.ttf'),size)
def text(draw,xy,value,size=32,bold=False,color=INK,width=None):
    f=font(size,bold)
    if width:
        lines=[];line=''
        for word in value.split():
            candidate=(line+' '+word).strip()
            if line and draw.textlength(candidate,font=f)>width:lines.append(line);line=word
            else:line=candidate
        lines.append(line);draw.multiline_text(xy,'\n'.join(lines),font=f,fill=color,spacing=12)
    else:draw.text(xy,value,font=f,fill=color)
def base(title,tag):
    im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
    logo=Image.open(ROOT/'public/brand/picachu-logo.jpg').convert('RGB');logo.thumbnail((64,64));im.paste(logo,(48,24))
    text(d,(128,24),'pipicachu',38,True);text(d,(48,90),title,30,True)
    d.rounded_rectangle((1240,24,1872,82),radius=16,fill='#EAF0FF');text(d,(1264,35),tag,24,True,BLUE)
    d.rectangle((0,936,W,H),fill=INK)
    return im

def graphics():
    im=base('Ai giao trước, ai trả trước?','Tình huống minh họa');d=ImageDraw.Draw(im)
    text(d,(96,178),'Cùng một giao dịch. Hai nỗi lo.',62,True)
    for x,name,role,desc,col in [(96,'Linh','Người bán','Bán tài nguyên thiết kế tự tạo',BLUE),(1000,'Alex','Người mua','Đã có ví Solana, chọn trả USDC','#376700')]:
        d.rounded_rectangle((x,310,x+824,774),radius=24,fill='white',outline='#D7DCE3',width=2)
        d.rounded_rectangle((x+32,342,x+244,402),radius=16,fill='#EAF0FF' if x==96 else '#EFFAD7')
        text(d,(x+50,352),role,28,True,col);text(d,(x+32,442),name,60,True)
        text(d,(x+32,538),desc,32,width=748);text(d,(x+32,650),'Chưa từng giao dịch với bên còn lại.',28,color=MUTED,width=748)
    im.save(OUT/'persona.png')
    im=base('Ai giao trước, ai trả trước?','Tình huống minh họa');d=ImageDraw.Draw(im)
    text(d,(96,174),'Thoả thuận qua cộng đồng quốc tế',54,True)
    d.rounded_rectangle((96,294,1480,464),radius=24,fill='#EAF0FF');text(d,(132,316),'Linh · Người bán',30,True,BLUE);text(d,(132,377),'Mình gửi file sau khi nhận tiền.',42,True)
    d.rounded_rectangle((440,500,1824,670),radius=24,fill='#EFFAD7');text(d,(476,523),'Alex · Người mua',30,True,'#376700');text(d,(476,586),'Mình muốn kiểm tra file trước khi thanh toán.',38,True)
    text(d,(96,752),'Hai bên đã chọn USDC. Vấn đề còn lại: thứ tự giao hàng và trả tiền.',30,color=MUTED,width=1710)
    im.save(OUT/'chat.png')
    im=base('Nhờ người trung gian — rồi sao?','Tình huống minh họa');d=ImageDraw.Draw(im)
    text(d,(96,234),'Ai đang giữ tiền?',82,True);text(d,(96,390),'Niềm tin vào người mua, người bán và người trung gian',40,width=1660)
    for i,s in enumerate(['Ai giao trước?','Ai trả trước?','Khi bất đồng, ai quyết định?']):
        x=96+i*584;d.rounded_rectangle((x,590,x+540,754),radius=20,fill='white',outline='#D7DCE3',width=2);text(d,(x+26,638),s,29,True,width=492)
    im.save(OUT/'question.png')
    im=base('Một link. Điều kiện rõ ràng.','Giải pháp pipicachu');d=ImageDraw.Draw(im)
    text(d,(96,178),'Giữ tiền trong vault của chương trình',58,True)
    for i,(a,b) in enumerate([('Người mua','Nạp USDC'),('Vault ký quỹ','Giữ theo điều kiện'),('Người bán','Nhận khi đủ điều kiện')]):
        x=96+i*584;d.rounded_rectangle((x,340,x+540,556),radius=24,fill=LIME if i==1 else 'white',outline='#D7DCE3',width=2);text(d,(x+28,380),a,42,True);text(d,(x+28,456),b,27,color=MUTED,width=480)
        if i<2:d.line((x+540,446,x+578,446),fill=BLUE,width=5);d.polygon([(x+578,446),(x+566,437),(x+566,455)],fill=BLUE)
    d.rounded_rectangle((504,640,1416,822),radius=20,fill='#EAF0FF');text(d,(540,670),'Trọng tài hỗ trợ xử tranh chấp',38,True,BLUE);text(d,(540,731),'Tiền mua hàng không nằm trong ví trọng tài.',30,color=MUTED)
    im.save(OUT/'solution.png')
    im=base('Kết quả rõ. Giới hạn cũng rõ.','Devnet · Token thử nghiệm');d=ImageDraw.Draw(im)
    text(d,(96,180),'2 USDC → 1,96 + 0,02 + 0,02',62,True)
    for i,(a,b) in enumerate([('Người bán','1,96 USDC'),('Trọng tài','0,02 USDC'),('Hệ thống','0,02 USDC')]):
        x=96+i*584;d.rounded_rectangle((x,318,x+540,550),radius=24,fill=LIME if i==0 else 'white',outline='#D7DCE3',width=2);text(d,(x+28,352),a,30,True);text(d,(x+28,427),b,48,True)
    for i,s in enumerate(['Không tự kiểm chứng chất lượng hàng hóa.','Chưa audit độc lập; còn quyền nâng cấp.','Clip này chưa demo tranh chấp hoặc keeper.']):text(d,(96,612+i*78),'• '+s,32,color=MUTED)
    im.save(OUT/'limits.png')
    im=base('Một link giao dịch. Kết quả có thể đối chiếu.','Khám phá sản phẩm');d=ImageDraw.Draw(im)
    text(d,(96,234),'pipicachu',102,True);text(d,(96,420),'pipicachu.vercel.app',48,True,BLUE);text(d,(96,512),'github.com/2274802010922/pipicachu',29,color=MUTED)
    text(d,(96,636),'Devnet · USDC thử nghiệm không có giá trị thật',29,color=MUTED,width=1100)
    qr=qrcode.make(M['site']).convert('RGB').resize((330,330),Image.Resampling.NEAREST);im.paste(qr,(1430,284));text(d,(1432,656),'Quét để mở website',26,True)
    im.save(OUT/'closing.png')
    im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im);logo=Image.open(ROOT/'public/brand/picachu-logo.jpg');logo.thumbnail((180,150));im.paste(logo,(96,96));text(d,(316,115),'pipicachu',86,True)
    text(d,(96,345),'Ai giao trước,',98,True);text(d,(96,475),'ai trả trước?',98,True);d.rounded_rectangle((96,690,1660,824),radius=20,fill=LIME);text(d,(130,720),'Demo ký quỹ USDC trên Solana',52,True);text(d,(96,906),'Problem → Giải pháp → Giao dịch Devnet thật',38,color=MUTED)
    im.save(OUT/'thumbnail-vi.png')

def static(image,seconds,name):
    run(['ffmpeg','-y','-hide_banner','-loglevel','error','-loop','1','-i',image,'-t',str(seconds),'-vf','fps=30,format=yuv420p','-an','-r','30','-video_track_timescale','15360','-c:v','libx264','-threads','4','-preset','fast','-crf','19',name],name)
    return name

def shot(start,end,crop,seconds,name,title,role,rate=1):
    im=base(title,'Devnet · Token thử nghiệm');d=ImageDraw.Draw(im);text(d,(48,886),role,25,True,BLUE);im.save(OUT/(name+'-canvas.png'))
    x,y,w,h=crop;scale=min(1824/w,748/h);sw=int(w*scale)//2*2;sh=int(h*scale)//2*2;ox=(W-sw)//2;oy=130+(748-sh)//2
    filt=f'[0:v]crop={w}:{h}:{x}:{y},setpts=(PTS-STARTPTS)/{rate},fps=30,scale={sw}:{sh}[ui];[1:v][ui]overlay={ox}:{oy}:shortest=1,tpad=stop_mode=clone:stop_duration={seconds},trim=duration={seconds},format=yuv420p[v]'
    run(['ffmpeg','-y','-hide_banner','-loglevel','error','-ss',str(start),'-t',str(end-start),'-i',str(SRC),'-loop','1','-i',name+'-canvas.png','-filter_complex',filt,'-map','[v]','-t',str(seconds),'-an','-r','30','-video_track_timescale','15360','-c:v','libx264','-threads','4','-preset','fast','-crf','19',name+'.mp4'],name)
    AUDIT.append({'output':name+'.mp4','sourceStart':start,'sourceEnd':end,'crop':crop,'outputDuration':seconds,'rate':rate,'readingHold':max(0,seconds-(end-start)/rate)})
    return name+'.mp4'

def concat(files,name):
    f=OUT/(name+'.txt');f.write_text(''.join("file '"+x+"'\n"for x in files),encoding='utf-8')
    run(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',f.name,'-c','copy',name+'.mp4'],name)
    return name+'.mp4'

def timecode(t):
    ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
def ass_time(t):
    cs=round(t*100);return f'{cs//360000}:{cs//6000%60:02}:{cs//100%60:02}.{cs%100:02}'
def prepared_words(scene):
    words=json.loads((OUT/(scene['id']+'-words.json')).read_text(encoding='utf-8'))
    tokens=scene['narration'].replace('pipicachu','pi pi ca chu').split()
    assert len(words)==len(tokens)
    for w,t in zip(words,tokens):
        assert re.sub(r'[^\w]','',w['text']).casefold()==re.sub(r'[^\w]','',t).casefold(),(w,t)
        w['text']=t
    pause=None
    if scene['id'] in ('fund','confirm'):
        phrase='Sau khi xác nhận' if scene['id']=='fund' else 'Người bán nhận'
        index=next(i for i in range(len(words)) if ' '.join(t.strip('.,;:?!') for t in tokens[i:i+len(phrase.split())])==phrase)
        cut=words[index]['start'];delay=(12.65 if scene['id']=='fund' else 7.65)-cut
        assert delay>0
        for w in words[index:]:w['start']+=delay;w['end']+=delay
        pause=(cut,delay)
    # Group the spoken brand spelling as one subtitle word.
    i=0
    while i<len(words)-3:
        if ' '.join(w['text'].strip('.,;:?!') for w in words[i:i+4])=='pi pi ca chu':
            merged={'start':words[i]['start'],'end':words[i+3]['end'],'text':'pipicachu'+words[i+3]['text'][len('chu'):]}
            words[i:i+4]=[merged]
        i+=1
    return words,pause

def captions():
    cues=[];offset=0
    for scene in M['scenes']:
        words,_=prepared_words(scene);group=[]
        for word in words:
            joined=' '.join(w['text']for w in group+[word])
            if group and(len(joined)>78 or word['end']-group[0]['start']>5 or word['start']-group[-1]['end']>0.6):
                cues.append((offset+.35+group[0]['start'],offset+.35+group[-1]['end'],group));group=[]
            group.append(word)
            if word['text'].endswith(('.', '?', ';')):
                cues.append((offset+.35+group[0]['start'],offset+.35+group[-1]['end'],group));group=[]
        if group:cues.append((offset+.35+group[0]['start'],offset+.35+group[-1]['end'],group))
        scene['timelineStart']=offset;offset+=scene['duration']
    # Avoid a short orphan subtitle such as a standalone "USDC.".
    for i in range(1,len(cues)):
        a,b,current=cues[i];pa,pb,previous=cues[i-1]
        if len(' '.join(w['text'] for w in current))<24 and not previous[-1]['text'].endswith(('.', '?', ';')):
            while len(previous)>3 and len(' '.join(w['text'] for w in current))<30:
                current.insert(0,previous.pop())
            if previous[-1]['text']=='rõ' and current[0]['text'].startswith('ràng'):
                current.insert(0,previous.pop())
            # Preserve each scene's absolute offset after moving words.
            origin=b-.35-current[-1]['end']
            cues[i-1]=(pa,origin+.35+previous[-1]['end'],previous)
            cues[i]=(origin+.35+current[0]['start'],b,current)
    srt=[];events=[]
    for i,(a,b,g)in enumerate(cues,1):
        value=' '.join(w['text']for w in g).replace('pi pi ca chu','pipicachu');lines=textwrap.wrap(value,width=42);assert len(lines)<=2,lines
        value='\n'.join(lines);end=min(b+.12,cues[i][0] if i<len(cues) else offset);srt.append(f'{i}\n{timecode(a)} --> {timecode(end)}\n{value}\n')
        events.append('Dialogue: 0,'+ass_time(a)+','+ass_time(end)+',Default,,0,0,0,,{\\an2}'+value.replace('\n','\\N'))
    (OUT/'pipicachu-demo-vi.srt').write_text('\n'.join(srt),encoding='utf-8')
    header='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Segoe UI,34,&H00FFFFFF,&H00FFFFFF,&H00142609,&H00142609,0,0,0,0,100,100,0,0,1,1.5,0,2,96,96,34,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    (OUT/'video.ass').write_text(header+'\n'.join(events)+'\n',encoding='utf-8')
    return offset,len(cues)

def render():
    graphics();sc={s['id']:s for s in M['scenes']};files=[];p=sc['problem']['duration']
    files.append(concat([static('persona.png',p*.40,'persona.mp4'),static('chat.png',p*.36,'chat.mp4'),static('question.png',p*.24,'question.mp4')],'problem'))
    files.append(static('solution.png',sc['solution']['duration'],'solution.mp4'))
    files.append(concat([shot(0,2.8,(0,110,1914,886),3,'demo-two-roles','Giao dịch Devnet thử nghiệm','Bên trái: Seller · Người bán | Bên phải: Buyer · Người mua'),shot(14,25.2,(0,234,944,730),8,'create-fields','01 · Người bán tạo deal','Seller · Người bán',1.3),shot(35.5,37.25,(528,112,428,668),3,'create-sign','01 · Ký tạo deal','Seller · Người bán · Popup Phantom thật'),shot(46,50,(0,110,944,588),sc['create']['duration']-14,'create-link','01 · Link giao dịch đã tạo','Seller · Người bán · Giữ hình để đọc')],'create'))
    files.append(concat([shot(55,60.4,(962,252,938,648),8,'buyer-open','02 · Người mua mở link','Buyer · Người mua'),shot(60.7,64.5,(1490,130,424,650),5,'buyer-sign','02 · Ký nạp 2 USDC Devnet','Buyer · Người mua · Popup Phantom thật'),shot(70,75,(962,240,938,675),sc['fund']['duration']-13,'buyer-funded','02 · Tiền đã nạp vào quỹ','Buyer · Người mua · Đã rút ngắn thời gian chờ')],'fund'))
    files.append(concat([shot(79,91,(0,258,944,700),12,'seller-deliver','03 · Đánh dấu đã bàn giao','Seller · Người bán · Bàn giao ngoài ứng dụng',1.15),shot(99,102,(962,238,938,662),sc['deliver']['duration']-12,'buyer-review','03 · Người mua kiểm tra','Buyer · Người mua · Đã rút ngắn thời gian chờ')],'deliver'))
    files.append(concat([shot(102,104.5,(962,230,938,684),6,'buyer-confirm','04 · Kiểm tra số tiền trước khi ký','Buyer · Người mua'),shot(106.8,107.75,(1490,130,424,650),2,'buyer-confirm-wallet','04 · Xác nhận bằng ví','Buyer · Người mua · Popup Phantom thật'),shot(114.5,122.5,(962,258,938,600),sc['confirm']['duration']-12,'result','04 · Người bán nhận 1,96 USDC','Buyer · Người mua · Đã rút ngắn thời gian chờ'),shot(119,122.5,(0,110,1914,886),4,'result-two-roles','Hai bên cùng thấy kết quả','Bên trái: Seller · Người bán | Bên phải: Buyer · Người mua')],'confirm'))
    files.append(static('limits.png',sc['limits']['duration'],'limits.mp4'));files.append(static('closing.png',sc['closing']['duration'],'closing.mp4'))
    total,count=captions();concat(files,'visual-master');audio=[]
    for scene in M['scenes']:
        name=scene['id']+'-voice.wav';_,pause=prepared_words(scene)
        args=['ffmpeg','-y','-hide_banner','-loglevel','error','-i',scene['id']+'.mp3']
        if pause:
            cut,delay=pause
            filt=f'[0:a]asplit[a][b];[a]atrim=end={cut},asetpts=PTS-STARTPTS[a1];[b]atrim=start={cut},asetpts=PTS-STARTPTS[b1];anullsrc=r=24000:cl=mono,atrim=duration={delay}[sil];[a1][sil][b1]concat=n=3:v=0:a=1,adelay=350:all=1,apad,atrim=duration={scene["duration"]}[v]'
            args+=['-filter_complex',filt,'-map','[v]']
        else:args+=['-af',f'adelay=350:all=1,apad,atrim=duration={scene["duration"]}']
        run(args+['-ar','48000','-ac','1',name],name);audio.append(name)
    f=OUT/'voice-list.txt';f.write_text(''.join("file '"+x+"'\n"for x in audio));run(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',f.name,'-c','copy','voice.wav'],'voice')
    rate=48000;t=np.arange(int(total*rate))/rate;signal=np.zeros_like(t)
    for i,freq in enumerate([146.832,174.614,220.0,293.664]):signal+=.006*np.sin(2*np.pi*freq*t)*(.55+.45*np.sin(2*np.pi*(.045+i*.008)*t+i))
    signal*=np.minimum(1,t/3)*np.minimum(1,(total-t)/4)
    with wave.open(str(OUT/'ambience.wav'),'wb')as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes((signal*32767).astype('<i2').tobytes())
    run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i','voice.wav','-i','ambience.wav','-filter_complex','[0:a]highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=7[v];[1:a]volume=0.65[m];[v][m]amix=inputs=2:normalize=0,alimiter=limit=0.84[a]','-map','[a]','-ar','48000','-ac','2','mixed.wav'],'mix')
    run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i','visual-master.mp4','-i','mixed.wav','-vf','ass=video.ass','-map','0:v','-map','1:a','-t',str(total),'-c:v','libx264','-threads','4','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart','pipicachu-demo-vi.mp4'],'final')
    manifest={'sourceSha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'totalSeconds':total,'voice':M['voice'],'rate':M['rate'],'pitch':M['pitch'],'subtitleCount':count,'scenes':M['scenes'],'shots':AUDIT,'music':'Original procedural ambience, no third-party samples','scope':'Normal successful deal only; no dispute or keeper footage; original file untouched.'}
    (OUT/'edit-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print('RENDERED',total,'seconds',count,'subtitle cues',flush=True)
if __name__=='__main__':render()
