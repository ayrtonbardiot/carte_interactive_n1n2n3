let markers = [];
let errors = [];

var map = L.map('map').setView([46.71109, 1.7191036], 6);

const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

async function fetchClubs(clubId) {
    try {
        const req = await fetch(`https://corsproxy.io/?` + encodeURIComponent(`https://api-dofa.prd-aws.fff.fr/api/clubs/${clubId}.json`));
        const data = await req.json();
        return data;
    } catch (error) {
        console.error(`Failed to fetch club with ID ${clubId}:`, error);
        return null;
    }
}

async function fetchEngagements(champId, pouleId) {
    try {
        const req = await fetch(`https://corsproxy.io/?` + encodeURIComponent(`https://api-dofa.prd-aws.fff.fr/api/engagements.json?competition.cp_no=${champId}&phase.ph_no=1&poule.gp_no=${pouleId}`));
        const data = await req.json();
        return data;
    } catch (error) {
        console.error(`Failed to fetch engagements for champ ID ${champId} and poule ID ${pouleId}:`, error);
        return [];
    }
}

async function fetchPoules(champId) {
    try {
        const req = await fetch(`https://corsproxy.io/?` + encodeURIComponent(`https://api-dofa.prd-aws.fff.fr/api/compets/${champId}/phases/1/poules.json`));
        const data = await req.json();
        return data;
    } catch (error) {
        console.error(`Failed to fetch poules for champ ID ${champId}:`, error);
        return [];
    }
}

function updateErrors() {
    document.getElementById("errors").innerHTML = errors.map(error => `<li>Impossible de charger les coordonnées pour : ${error.club.name} (${error.championnat.name})</li>`).join('');
}

function createClubMarker(club, championnat) {
    if (!club.latitude || !club.longitude) {
        console.warn(`Club ${club.name} does not have valid coordinates.`);
        errors.push({ club, championnat });
        return;
    }

    const clubIcon = L.icon({
        iconUrl: `https://cdn-transverse.azureedge.net/phlogos/BC${club.affiliation_number}.jpg`,
        iconSize: [50, 50],
        iconAnchor: [25, 25], // Centre de l'icône
        popupAnchor: [0, -25] // Ajustement pour centrer le popup au-dessus de l'icône
    });

    
    const existingMarker = markers.find(marker => marker.marker.getLatLng().lat === club.latitude && marker.marker.getLatLng().lng === club.longitude);

    if (existingMarker) {
        club.longitude += 0.003;
    }

    const marker = L.marker([club.latitude, club.longitude], { icon: clubIcon }).addTo(map);
    marker.bindPopup(`<b>${club.name}</b><br>${championnat.name}<br>`);
    markers.push({ champId: championnat.id, marker });
}

async function addMarkersForChampionship(champId) {
    const poules = await fetchPoules(champId);
    const engagementsPromises = poules.map(poule => fetchEngagements(champId, poule.stage_number));
    const engagements = await Promise.all(engagementsPromises);

    const clubPromises = engagements.flat().map(club => fetchClubs(club.equipe.club.cl_no));
    const clubsData = await Promise.all(clubPromises);

    clubsData.forEach((clubData, index) => {
        if (clubData) {
            createClubMarker(clubData, { name: engagements.flat()[index].competition.name, id: champId });
        }
    });

    updateErrors();
}

const checkboxes = document.getElementsByTagName("input");

for(let checkbox of checkboxes) {
    checkbox.addEventListener('change', async () => {
        if (checkbox.checked) {
            const champId = checkbox.dataset.champ;
            await addMarkersForChampionship(champId);
        } else {
            const markersToRemove = markers.filter(marker => marker.champId === checkbox.dataset.champ);
            markersToRemove.forEach(marker => map.removeLayer(marker.marker));
            markers = markers.filter(marker => marker.champId !== checkbox.dataset.champ);
            errors = errors.filter(error => error.championnat.id !== checkbox.dataset.champ);
            updateErrors();
        }
    });
}

document.addEventListener("DOMContentLoaded", function(event) {
    for(let checkbox of checkboxes) {
        checkbox.checked = false;
    }
});

console.log('\r\n\r\n _____            _         _   _  __      ___   _  _____     ___   _  _____ \r\n\/  __ \\          | |       | \\ | |\/  |    \/ \/ \\ | |\/ __  \\   \/ \/ \\ | ||____ |\r\n| \/  \\\/ __ _ _ __| |_ ___  |  \\| |`| |   \/ \/|  \\| |`\' \/ \/\'  \/ \/|  \\| |    \/ \/\r\n| |    \/ _` | \'__| __\/ _ \\ | . ` | | |  \/ \/ | . ` |  \/ \/   \/ \/ | . ` |    \\ \\\r\n| \\__\/\\ (_| | |  | ||  __\/ | |\\  |_| |_\/ \/  | |\\  |.\/ \/___\/ \/  | |\\  |.___\/ \/\r\n \\____\/\\__,_|_|   \\__\\___| \\_| \\_\/\\___\/_\/   \\_| \\_\/\\_____\/_\/   \\_| \\_\/\\____\/ \r\n                                                                             \r\n                                                                             \r\n\r\npar https://github.com/ayrtonbardiot');