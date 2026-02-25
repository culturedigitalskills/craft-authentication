import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useTranslations } from 'next-intl'
import { useParams } from 'next/dist/client/components/navigation';
import Link from 'next/link';
import { Badge, User, Calendar, QrCode } from 'lucide-react';
import { formatDateTime } from '@/components/formatDateTime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QRCode } from '@/components/qrcode';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}
 let crafts = [
  {
    "id": 1,
    "title": "Macramé Wall Hanging",
    "description": "A decorative textile art created by knotting rope or cord into intricate patterns. Using basic knots like the square knot and half hitch, you can craft stunning boho-style wall pieces that add texture and warmth to any room.",
    "owner": "Sophie Hartwell",
    "email": "sophie.hartwell@crafthaus.io",
    "createdAt": "2025-03-12T08:24:11Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/7/70/Textile_piece%2C_macram%C3%A9_%28AM_16090-2%29.jpg"
  },
  {
    "id": 2,
    "title": "Hand-Thrown Pottery",
    "description": "The ancient craft of shaping clay vessels on a spinning wheel. From bowls to vases, hand-thrown pottery combines rhythmic technique with creative instinct, resulting in uniquely imperfect pieces that carry the maker's touch in every curve.",
    "owner": "Marcus Delgado",
    "email": "m.delgado@clayworks.co",
    "createdAt": "2025-04-07T14:03:55Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/2/2a/Pottenbakkersschijf.JPG"
  },
  {
    "id": 3,
    "title": "Linocut Printmaking",
    "description": "A relief printing technique where designs are carved into a linoleum block, inked, and pressed onto paper or fabric. The bold, graphic quality of linocut prints makes it perfect for posters, greeting cards, and repeating textile patterns.",
    "owner": "Yuki Tanaka",
    "email": "yuki.tanaka@pressandink.studio",
    "createdAt": "2025-05-19T11:47:30Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/1/12/Printing_Using_a_Linocut_Design.jpg"
  },
  {
    "id": 4,
    "title": "Soy Candle Making",
    "description": "The craft of pouring scented soy wax into moulds or vessels with embedded wicks. By blending essential oils and botanicals, makers create bespoke candles with unique aromas and burn times far cleaner than traditional paraffin alternatives.",
    "owner": "Clara Osei",
    "email": "clara.osei@wickandwax.com",
    "createdAt": "2025-06-02T09:15:00Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/b/be/Soy_tealight_candles.jpg"
  },
  {
    "id": 5,
    "title": "Bookbinding",
    "description": "The art of assembling handmade books by folding, sewing, and gluing paper signatures into custom covers. From Coptic stitch journals to leather-bound notebooks, bookbinding produces heirloom-quality objects built to last generations.",
    "owner": "Finn Calloway",
    "email": "finn@spineandstitch.net",
    "createdAt": "2025-07-28T16:52:43Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/7/7e/Bookbinding_tie_thread_1.jpg"
  },
  {
    "id": 6,
    "title": "Indigo Dyeing",
    "description": "An ancient resist-dyeing technique using natural indigo pigment to produce striking blue patterns on fabric. Methods like shibori involve folding, twisting, or binding cloth before immersion, yielding one-of-a-kind wearable pieces.",
    "owner": "Amara Diallo",
    "email": "amara.diallo@indigostudio.co",
    "createdAt": "2025-08-14T07:38:22Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/0/0c/GutierrezWorkshopTeotitlan073.jpg"
  },
  {
    "id": 7,
    "title": "Stained Glass",
    "description": "The craft of cutting and joining coloured glass pieces with lead came or copper foil to form luminous panels. When light passes through the finished work, the colours shift and glow, transforming any window or frame into living art.",
    "owner": "Petra Novák",
    "email": "petra.novak@lumenglass.eu",
    "createdAt": "2025-09-03T13:21:09Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/c/c8/Leonard_French_La_Trobe_03-2_cropped.jpg"
  },
  {
    "id": 8,
    "title": "Leather Tooling",
    "description": "A craft of stamping and carving decorative patterns into vegetable-tanned leather using specialised tools. The dampened surface accepts deep impressions that dry permanently, making it ideal for belts, wallets, and journal covers.",
    "owner": "Rodrigo Alves",
    "email": "r.alves@hidecraft.io",
    "createdAt": "2025-10-17T10:05:37Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/6/6c/For%C3%B2.JPG"
  },
  {
    "id": 9,
    "title": "Wet Felting",
    "description": "A textile craft that bonds raw wool fibres together using hot water, soap, and agitation to create a dense, seamless fabric. Sculptural forms, bowls, and wall art can all be shaped during the felting process before the material sets.",
    "owner": "Ingrid Sørensen",
    "email": "ingrid.sorensen@woolform.dk",
    "createdAt": "2025-11-25T18:44:50Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/5/5b/An_assortment_of_fiber_arts_created_by_one_teenage_artist_%2881c7f627-155d-451f-677b-05a5b8ebb4ff%29.JPG"
  },
  {
    "id": 10,
    "title": "Resin Casting",
    "description": "The process of pouring pigmented or clear epoxy resin into moulds to encapsulate botanicals, pigments, or objects. Once cured, the result is a glass-like solid that can be shaped into jewellery, coasters, or sculptural decorative pieces.",
    "owner": "Theo Abara",
    "email": "theo@resinrift.studio",
    "createdAt": "2025-12-31T23:59:01Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/e/ed/Resin_crafts.jpg"
  }
];
export default async function CraftIDPage({ params }: PageProps) {
    const { id } = await params;

    // const p = await params;  
    // const { craftid } = p;
    console.log('Craft ID from URL:', id);

    // Construct the full URL for the QR code
    // console.log("process.env.NEXT_PUBLIC_BASE_URL:", process.env.NEXT_PUBLIC_BASE_URL);
    const currentPageUrl = `${process.env.AUTH_URL}/crafts/${id}`;
    
    return <OneCraftsPage craftid={id} currentPageUrl={currentPageUrl} />;

}

function OneCraftsPage({craftid, currentPageUrl}: {craftid: string, currentPageUrl: string}) {

    const t = useTranslations();
    

      return (
    <Container> 
    {/* Main content */}
    
    <div className="grid gap-8 lg:grid-cols-2">
    
    {/* Image section */}
    <div className="space-y-4">
      {crafts.find(c => c.id === parseInt(craftid))?.image ? (
        <div className="relative aspect-square overflow-hidden rounded-lg border border-border">
              <Image src={crafts.find(c => c.id === parseInt(craftid))?.image || ''} alt="Craft" fill className="object-cover" priority />

            {/* <img src={crafts.find(c => c.id === parseInt(craftid))?.image} alt="Craft" className="w-full max-w-md rounded-lg shadow-md" /> */}
            
        </div>

      ) : (
            <div className="flex aspect-square items-center justify-center rounded-lg border border-border bg-muted">
              <p className="text-muted-foreground">{t('crafts.details.noDescription')}</p>
            </div>
      )}   
        <div>
            <div className="mb-2 flex items-center gap-2 justify-center">
              <h1 className="text-3xl font-bold tracking-tight">{crafts.find(c => c.id === parseInt(craftid))?.title || t('crafts.details.noDescription')}</h1>
              {/* <Badge variant="outline" className="text-xs">
                Public
              </Badge> */}
            </div>
            <p className="mt-2 text-lg text-muted-foreground">{crafts.find(c => c.id === parseInt(craftid))?.description || t('crafts.details.noDescription')}</p>
        </div>       
    </div>          

    {/* Details section */}
    <div className="space-y-6">
    {/* Metadata */}
          <div className="space-y-4">
            {/* Creator information */}
            {crafts.find(c => c.id === parseInt(craftid))?.owner  && (
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('crafts.details.createdBy')}:</span>
                <span className="text-sm font-bold rounded-lg border border-border bg-muted px-2 py-1">{crafts.find(c => c.id === parseInt(craftid))?.email || t('crafts.details.noDescription')}</span>
              </div>
            )}

            {/* Created date */}
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('crafts.details.createdOn')}:</span>
              <span className="text-sm text-muted-foreground">{formatDateTime(crafts.find(c => c.id === parseInt(craftid))?.createdAt || '')}</span>
            </div>

            {/* Updated date if different */}
            <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Updated:</span>
                <span className="text-sm text-muted-foreground">{formatDateTime(crafts.find(c => c.id === parseInt(craftid))?.createdAt || '')}</span>
            </div>
            
          </div>

        {/* QR Code card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <QrCode className="h-4 w-4" />
                {t('crafts.details.qrCodeTitle')}
              </CardTitle>
              <CardDescription>{t('crafts.details.qrCodeDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-16">
              <div className="h-48 w-48 rounded-lg border bg-white p-4">
                {/* Allow for colors to be sent to QR code. */}
                {/* <QRCodeSVG value={currentPageUrl} fgColor={'oklch(0.7 0.1406 223.41)'} bgColor={'oklch(1.00 0.000 70)'} margin={2} className="h-full w-full" /> */}
                {/* <QRCode data={currentPageUrl}/>   */}

                 <QRCode data={currentPageUrl} foreground={'oklch(0.2 0.1406 223.41)'} background={'oklch(1.00 0.000 70)'} margin={2} className="h-full w-full" />
              </div>
              <div className="max-w-full break-all text-center text-xs text-muted-foreground">
                {currentPageUrl}
                </div>
            </CardContent>
          </Card>

          {/* Verifiable Credential card */}
          {/* {craft.verifiableCredential && (
            <VerifiableCredentialCard
              craftId={craft.id}
              verifiableCredential={craft.verifiableCredential as Record<string, unknown>}
            /> 
          )}*/}
    </div>
    </div>
    {/* Go back to crafts */}
    <hr className="my-8" />
    <div className="flex flex-wrap gap-3">
    <Button variant="outline" asChild>
          <Link href="/crafts">
              {t('crafts.details.backToCrafts')}
          </Link>
    </Button> 
    </div>
    </Container>
    
    )
  }
