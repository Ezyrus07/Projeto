use strict; use warnings;
local $/;
my $file = shift;
open my $fh, '<', $file or die $!;
my $txt = <$fh>;
close $fh;

# Force edit mode: accept only id param
$txt =~ s/if \(idAnuncio \&\& modo === \'edit\'\) \{/if (!idAnuncio) {\n            alert("ID do anuncio nao informado.");\n            window.location.href = "meuperfil.html";\n            return;\n        }\n\n        if (idAnuncio) {\n            \/\/ modo edit forcado nesta pagina\n/;

# Remove hiding of step 3 circle (we keep it with lock message)
$txt =~ s/\n\s*const step3Circle = document\.getElementById\(\x27p-3\x27\);\s*\n\s*if\(step3Circle\) step3Circle\.style\.display = \'none\';\s*//;

open my $out, '>', $file or die $!;
print $out $txt;
close $out;
