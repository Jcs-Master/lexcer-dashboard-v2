import os
from app import create_app
from app.models import db, User, Template

app = create_app()

with app.app_context():
    # Crear usuario de prueba
    if not User.query.filter_by(username='admin').first():
        user = User(username='admin', email='admin@lexcer.net')
        user.set_password('admin123')
        db.session.add(user)
        db.session.commit()
        print('Usuario creado: admin / admin123')
    else:
        user = User.query.filter_by(username='admin').first()
        print('Usuario admin ya existe')

    # Crear plantillas de ejemplo
    sample_templates = [
        {
            'name': 'Bridge Domain Production',
            'template_type': 'aci_bridge_domain',
            'description': 'Bridge Domain para entorno productivo',
            'content': '''## Bridge Domain Configuration
# Tenant: {{tenant}}
# BD: {{bd_name}}

fvBD
  dn "uni/tn-{{tenant}}/BD-{{bd_name}}"
  name "{{bd_name}}"
  unkMacUcastAct "flood"
  arpFlood "yes"
  unicastRoute "yes"
  subnet
    dn "uni/tn-{{tenant}}/BD-{{bd_name}}/subnet-[{{gateway}}]"
    ip "{{gateway}}"
    scope "public"
''',
            'variables': {'tenant': 'PROD', 'bd_name': 'BD_WEB', 'gateway': '10.1.1.1/24'}
        },
        {
            'name': 'Contract Web-Allow',
            'template_type': 'aci_contract',
            'description': 'Permitir trafico HTTP/HTTPS',
            'content': '''## Contract Configuration
# Tenant: {{tenant}}
# Contract: {{contract_name}}

vzBrCP
  dn "uni/tn-{{tenant}}/brc-{{contract_name}}"
  name "{{contract_name}}"
  scope "tenant"
  vzSubj
    dn "uni/tn-{{tenant}}/brc-{{contract_name}}/subj-{{subject_name}}"
    name "{{subject_name}}"
    vzRsSubjFiltAtt
      tnVzFilterName "allow-all"
''',
            'variables': {'tenant': 'PROD', 'contract_name': 'WEB-ALLOW', 'subject_name': 'HTTP-HTTPS'}
        },
        {
            'name': 'EPG Application Servers',
            'template_type': 'aci_epg',
            'description': 'EPG para servidores de aplicacion',
            'content': '''## EPG Configuration
# Tenant: {{tenant}}
# AP: {{ap_name}}
# EPG: {{epg_name}}

fvAEPg
  dn "uni/tn-{{tenant}}/ap-{{ap_name}}/epg-{{epg_name}}"
  name "{{epg_name}}"
  fvRsBd
    tnFvBDName "{{bd_name}}"
  fvRsDomAtt
    tDn "uni/vmmp-VMware/dom-{{vmm_domain}}"
''',
            'variables': {'tenant': 'PROD', 'ap_name': 'AP_WEB', 'epg_name': 'EPG_APP', 'bd_name': 'BD_WEB', 'vmm_domain': 'VCENTER'}
        },
    ]

    for tmpl_data in sample_templates:
        if not Template.query.filter_by(name=tmpl_data['name'], user_id=user.id).first():
            template = Template(
                user_id=user.id,
                name=tmpl_data['name'],
                description=tmpl_data['description'],
                template_type=tmpl_data['template_type'],
                content=tmpl_data['content'],
                variables=tmpl_data['variables'],
                version='1.0',
                status='active'
            )
            db.session.add(template)
    
    db.session.commit()
    print(f'Plantillas creadas: {len(sample_templates)}')
    print('\\nSeed completado. Puedes hacer login con:')
    print('  Usuario: admin')
    print('  Password: admin123')